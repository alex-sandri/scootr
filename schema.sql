----------------
-- EXTENSIONS --
----------------

create extension "postgis";

-------------
-- DOMAINS --
-------------

/*
    An id is made up of three parts:
    - a prefix (3 characters)
    - a separator (an underscore)
    - a random string
*/
create domain "id" as text check(value like '___\_%');

/*
    '320' is the maximum length of an email address as documented here:
    https://tools.ietf.org/html/rfc3696#section-3
*/
create domain "email_address" as varchar(320);

create domain "fiscal_number" as char(16) check (value = upper(value));

create domain "location" as geography(point, 4326); -- https://epsg.io/4326

------------
-- TABLES --
------------

create table "user_types"
(
    "id" text not null,

    primary key ("id")
);

create table "users"
(
    "id" id not null,
    "type" text not null default 'user',
    "first_name" text not null,
    "last_name" text not null,
    "email" email_address not null,
    "birth_date" date not null,
    "fiscal_number" fiscal_number not null,

    primary key ("id"),

    unique ("email"),
    unique ("fiscal_number"),

    foreign key ("type") references "user_types" on update cascade on delete cascade,

    check ("id" like 'usr_%'),
    check ("birth_date" < current_date)
);

create table "wallets"
(
    "id" id not null,
    "name" varchar(30) not null,
    "user" id not null,
    "stripe_customer_id" text,

    primary key ("id"),

    unique ("name", "user"),

    foreign key ("user") references "users" on update cascade on delete cascade,

    check ("id" like 'wlt_%')
);

create table "default_wallets"
(
    "user" id not null,
    "wallet" id not null,

    primary key ("user"),

    unique ("wallet"),

    foreign key ("user") references "users" on update cascade on delete cascade,
    foreign key ("wallet") references "wallets" on update cascade on delete cascade
);

create table "payment_methods"
(
    "id" id not null,
    "type" text not null,
    "data" json not null,
    "wallet" id not null,
    "stripe_id" text not null,

    primary key ("id"),

    unique ("stripe_id"),

    foreign key ("wallet") references "wallets" on update cascade on delete cascade,

    check ("id" like 'pmt_%')
);

create table "default_payment_methods"
(
    "wallet" id not null,
    "payment_method" id not null,

    primary key ("wallet"),

    unique ("payment_method"),

    foreign key ("wallet") references "wallets" on update cascade on delete cascade,
    foreign key ("payment_method") references "payment_methods" on update cascade on delete cascade
);

create table "vehicles"
(
    "id" id not null,
    "battery_level" int not null,
    "location" location not null,
    "available" boolean not null default true,

    primary key ("id"),

    check ("id" like 'vcl_%'),
    check ("battery_level" between 0 and 100)
);

create table "rides"
(
    "id" id not null,
    "vehicle" id not null,
    "wallet" id not null,
    "start_time" timestamp not null,
    "end_time" timestamp,

    primary key ("id"),

    foreign key ("vehicle") references "vehicles" on update cascade on delete cascade,
    foreign key ("wallet") references "wallets" on update cascade on delete cascade,

    check ("id" like 'rid_%'),
    check ("start_time" <= "end_time")
);

create table "sessions"
(
    "id" id not null,
    "user" id not null,
    "expires_at" timestamp not null,

    primary key ("id"),

    foreign key ("user") references "users" on update cascade on delete cascade,

    check ("id" like 'ses_%'),
    check ("expires_at" > current_timestamp)
);

create table "ride_waypoints"
(
    "id" id not null,
    "ride" id not null,
    "location" location not null,
    "timestamp" timestamp not null,

    primary key ("id"),

    unique ("ride", "timestamp"),

    foreign key ("ride") references "rides" on update cascade on delete cascade,

    check ("id" like 'rwp_%')
);

/*
    This is used to keep track of all the users
    that signed up in order to prevent fraud,
    for example deleting an account with negative
    balance to avoid paying it back or signing up
    again to receive discounts or bonuses previously
    already redeemed
*/
create table "old_users"
(
    "fiscal_number" fiscal_number not null,
    "balance" numeric(10, 2) not null,
    "deleted_at" generated always as current_timestamp stored,

    primary key ("fiscal_number")
);

create table "transaction_reasons"
(
    "id" text not null,

    primary key ("id")
);

create table "transactions"
(
    "id" id not null,
    "amount" numeric(10, 2) not null,
    "timestamp" timestamp not null default current_timestamp,
    "wallet" id not null,
    "reason" text not null,
    /*
        This can reference (specified in "reason"):
        - A ride if this is the charge transaction after the ride has ended
        - A Stripe Payment Intent if this is a transaction to add funds to a wallet (either recurring or not)
    */
    "external_id" text not null,

    primary key ("id"),

    unique ("external_id"),

    foreign key ("wallet") references "wallets" on update cascade on delete cascade,
    foreign key ("reason") references "transaction_reasons" on update cascade on delete cascade,

    check ("id" like 'trx_%'),
    check ("timestamp" <= current_timestamp)
);

create table "subscriptions"
(
    "id" id not null,
    "amount" numeric(10, 2) not null,
    "wallet" id not null,
    "status" text not null,
    "current_period_end" timestamp not null,
    "cancel_at_period_end" boolean not null,
    "deleted" boolean not null,
    "stripe_id" text not null,

    primary key ("id"),

    unique ("stripe_id"),

    foreign key ("wallet") references "wallets" on update cascade on delete cascade,

    check ("id" like 'sub_%'),
    check ("amount" > 0)
);

create table "request_logs"
(
    "remote_address" text not null,
    "method" text not null,
    "path" text not null,
    "timestamp" timestamp not null,
    "status_code" int not null,
    "user" id, -- no FK to keep logs even after a user is deleted

    primary key ("remote_address", "method", "path", "timestamp"),

    check ("method" = upper("method")),
    check ("timestamp" <= current_timestamp)
);

create table "exports"
(
    "id" id not null,
    "user" id not null,
    "data" json not null,
    "created_at" timestamp not null default current_timestamp,
    "completed_at" timestamp,
    "expires_at" timestamp,

    primary key ("id"),

    foreign key ("user") references "users" on update cascade on delete cascade,

    check ("id" like 'exp_%'),
    check ("created_at" <= current_timestamp),
    check ("completed_at" >= "created_at"),
    check ("expires_at" > "completed_at")
);

create table "hubs"
(
    "id" id not null,
    "location" location not null,

    primary key ("id"),

    check ("id" like 'hub_%')
);

-----------
-- VIEWS --
-----------

create view "v_vehicles"
as
    select
        "id",
        "battery_level",
        st_x("location"::text) || ';' || st_y("location"::text) as "location",
        "location" as "postgis_location",
        "available"
    from "vehicles";

create view "v_ride_waypoints"
as
    select
        "id",
        "ride",
        st_x("location"::text) || ';' || st_y("location"::text) as "location",
        "timestamp"
    from "ride_waypoints";

------------------
-- INITIAL DATA --
------------------

insert into "user_types" values
    ('admin'),
    ('user');

insert into "transaction_reasons" values
    ('ride'),
    ('top-up'),
    ('subscription');
