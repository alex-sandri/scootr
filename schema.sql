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
    "balance" numeric(10, 2) not null,
    "user" id not null,
    "stripe_customer_id" text,

    primary key ("id"),

    unique ("name", "user"),

    foreign key ("user") references "users" on update cascade on delete cascade,

    check ("id" like 'wlt_%'),
    check ("balance" >= 0)
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
    "location" geography(point, 4326) not null, -- https://epsg.io/4326
    "available" boolean not null default true,

    primary key ("id"),

    check ("id" like 'vcl_%'),
    check ("battery_level" between 0 and 100)
);

create table "rides"
(
    "id" id not null,
    "user" id not null,
    "vehicle" id not null,
    "wallet" id not null,
    "start_time" timestamp not null,
    "end_time" timestamp,
    "start_location" geography(point, 4326) not null,
    "end_location" geography(point, 4326),
    "amount" numeric(10, 2),

    primary key ("id"),

    foreign key ("user") references "users" on update cascade on delete cascade,
    foreign key ("vehicle") references "vehicles" on update cascade on delete cascade,
    foreign key ("wallet") references "wallets" on update cascade on delete cascade,

    check ("id" like 'rid_%'),
    check ("start_time" <= "end_time"),
    check ("amount" > 0)
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
    "location" geography(point, 4326) not null,
    "timestamp" timestamp not null,

    primary key ("id"),

    unique ("ride", "timestamp"),

    foreign key ("ride") references "rides" on update cascade on delete cascade,

    check ("id" like 'rwp_%')
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

create view "v_rides"
as
    select
        "id",
        "user",
        "vehicle",
        "wallet",
        "start_time",
        "end_time",
        st_x("start_location"::text) || ';' || st_y("start_location"::text) as "start_location",
        st_x("end_location"::text) || ';' || st_y("end_location"::text) as "end_location",
        "amount"
    from "rides";

------------------
-- INITIAL DATA --
------------------

insert into "user_types" values
    ('admin'),
    ('user');
