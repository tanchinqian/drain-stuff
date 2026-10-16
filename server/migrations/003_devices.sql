CREATE TABLE IF NOT EXISTS devices (id TEXT PRIMARY KEY, body TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS device_readings (device_id TEXT NOT NULL REFERENCES devices(id), counter INTEGER NOT NULL, at TEXT NOT NULL, source TEXT NOT NULL CHECK(source IN ('simulated','device')), body TEXT NOT NULL, PRIMARY KEY(device_id,counter));
