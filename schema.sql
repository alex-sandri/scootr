----------------
-- ESTENSIONI --
----------------

create extension "postgis";

-------------
-- TABELLE --
-------------

create table "utenti"
(
    "id" text not null,
    "nome" text not null,
    "cognome" text not null,
    "email" varchar(320) not null,
    "data_nascita" date not null,
    "codice_fiscale" char(16) not null,
    "stripe_customer_id" text,

    primary key ("id"),

    unique ("email"),
    unique ("codice_fiscale"),

    check ("data_nascita" < current_date),
    check ("codice_fiscale" = upper("codice_fiscale"))
);

create table "portafogli"
(
    "id" text not null,
    "utente" text not null,
    "credito" numeric(10, 2) not null,

    primary key ("id"),

    unique ("utente"),

    foreign key ("utente") references "utenti" on update cascade on delete cascade,

    check ("credito" >= 0)
);

create table "metodi_pagamento"
(
    "id" text not null,
    "tipo" text not null,
    "dati" json not null,
    "portafoglio" text not null,

    primary key ("id"),

    foreign key ("portafoglio") references "portafogli" on update cascade on delete cascade
);

create table "mezzi"
(
    "id" text not null,
    "livello_batteria" int not null,
    "posizione" geography not null,

    primary key ("id"),

    check ("livello_batteria" between 0 and 100)
);

create table "corse"
(
    "id" text not null,
    "utente" text not null,
    "mezzo" text not null,
    "orario_partenza" timestamp not null,
    "orario_arrivo" timestamp,
    "posizione_partenza" geography not null,
    "posizione_arrivo" geography,

    primary key ("id"),

    foreign key ("utente") references "utenti" on update cascade on delete cascade,
    foreign key ("mezzo") references "mezzi" on update cascade on delete cascade,

    check ("orario_partenza" <= "orario_arrivo")
);
