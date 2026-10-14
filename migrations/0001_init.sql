CREATE TABLE pots (
	id          TEXT PRIMARY KEY,
	admin_token TEXT NOT NULL,
	theme       TEXT NOT NULL,
	version     INTEGER NOT NULL DEFAULT 0, -- bumped on every change, for optimistic locking
	created_at  INTEGER NOT NULL,
	updated_at  INTEGER NOT NULL,
	closed_at   INTEGER
);

CREATE INDEX pots_updated_at ON pots (updated_at);

CREATE TABLE participants (
	id          INTEGER PRIMARY KEY,
	pot_id      TEXT NOT NULL REFERENCES pots (id) ON DELETE CASCADE,
	name        TEXT NOT NULL,
	name_key    TEXT NOT NULL,
	code_name   TEXT NOT NULL,
	token       TEXT NOT NULL,
	receiver_id INTEGER REFERENCES participants (id) ON DELETE SET NULL,
	created_at  INTEGER NOT NULL,
	UNIQUE (pot_id, name_key),
	UNIQUE (pot_id, code_name)
);

CREATE TABLE exclusions (
	pot_id TEXT NOT NULL REFERENCES pots (id) ON DELETE CASCADE,
	a      INTEGER NOT NULL REFERENCES participants (id) ON DELETE CASCADE,
	b      INTEGER NOT NULL REFERENCES participants (id) ON DELETE CASCADE,
	PRIMARY KEY (pot_id, a, b),
	CHECK (a < b)
);
