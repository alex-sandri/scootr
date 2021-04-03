----------------
-- ESTENSIONI --
----------------

create extension "postgis";

------------
-- DOMINI --
------------

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

-------------
-- TABELLE --
-------------

create table "utenti"
(
    "id" id not null,
    "nome" text not null,
    "cognome" text not null,
    "email" email_address not null,
    "data_nascita" date not null,
    "codice_fiscale" char(16) not null,
    "stripe_customer_id" text,

    primary key ("id"),

    unique ("email"),
    unique ("codice_fiscale"),

    check ("id" like 'usr_%'),
    check ("data_nascita" < current_date),
    check ("codice_fiscale" = upper("codice_fiscale"))
);

create table "portafogli"
(
    "id" id not null,
    "utente" text not null,
    "credito" numeric(10, 2) not null,

    primary key ("id"),

    unique ("utente"),

    foreign key ("utente") references "utenti" on update cascade on delete cascade,

    check ("id" like 'wlt_%'),
    check ("credito" >= 0)
);

create table "metodi_pagamento"
(
    "id" id not null,
    "tipo" text not null,
    "dati" json not null,
    "portafoglio" text not null,

    primary key ("id"),

    foreign key ("portafoglio") references "portafogli" on update cascade on delete cascade,

    check ("id" like 'pmt_%')
);

create table "mezzi"
(
    "id" id not null,
    "livello_batteria" int not null,
    "posizione" geography not null,

    primary key ("id"),

    check ("id" like 'vcl_%'),
    check ("livello_batteria" between 0 and 100)
);

create table "corse"
(
    "id" id not null,
    "utente" text not null,
    "mezzo" text not null,
    "orario_partenza" timestamp not null,
    "orario_arrivo" timestamp,
    "posizione_partenza" geography not null,
    "posizione_arrivo" geography,

    primary key ("id"),

    foreign key ("utente") references "utenti" on update cascade on delete cascade,
    foreign key ("mezzo") references "mezzi" on update cascade on delete cascade,

    check ("id" like 'rid_%'),
    check ("orario_partenza" <= "orario_arrivo")
);
