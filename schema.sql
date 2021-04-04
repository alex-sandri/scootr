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
    "type" text not null,
    "first_name" text not null,
    "last_name" text not null,
    "email" email_address not null,
    "birth_date" date not null,
    "fiscal_number" fiscal_number not null,
    "stripe_customer_id" text,

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
    "user" id not null,
    "balance" numeric(10, 2) not null,

    primary key ("id"),

    unique ("user"),

    foreign key ("user") references "users" on update cascade on delete cascade,

    check ("id" like 'wlt_%'),
    check ("balance" >= 0)
);

create table "payment_methods"
(
    "id" id not null,
    "type" text not null,
    "data" json not null,
    "wallet" id not null,

    primary key ("id"),

    foreign key ("wallet") references "wallets" on update cascade on delete cascade,

    check ("id" like 'pmt_%')
);

create table "vehicles"
(
    "id" id not null,
    "battery_level" int not null,
    "location" geography(point, 4326) not null, -- https://epsg.io/4326

    primary key ("id"),

    check ("id" like 'vcl_%'),
    check ("battery_level" between 0 and 100)
);

create table "rides"
(
    "id" id not null,
    "user" id not null,
    "vehicle" id not null,
    "start_time" timestamp not null,
    "end_time" timestamp,
    "start_location" geography not null,
    "end_location" geography,

    primary key ("id"),

    foreign key ("user") references "users" on update cascade on delete cascade,
    foreign key ("vehicle") references "vehicles" on update cascade on delete cascade,

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

create table "sign_in_requests"
(
    "id" id not null,
    "token" text not null,
    "user" id not null,
    "session" id,
    "expires_at" timestamp not null,

    primary key ("id"),

    unique ("token"),

    foreign key ("user") references "users" on update cascade on delete cascade,
    foreign key ("session") references "sessions" on update cascade on delete cascade,

    check ("id" like 'sir_%'),
    check ("expires_at" > current_timestamp at time zone 'UTC')
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
        "location" as "postgis_location"
    from "vehicles";

------------------
-- INITIAL DATA --
------------------

insert into "user_types" values
    ('admin'),
    ('user');
