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

    primary key ("id"),

    unique ("email"),
    unique ("codice_fiscale"),

    check ("data_nascita" < current_date)
);

create table "portafogli"
(
    "id" text not null,
    "utente" text not null,
    "credito" numeric(10, 2) not null,

    primary key ("id"),

    unique ("utente"),

    foreign key ("utente") references "utenti" on update cascade on delete cascade

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
