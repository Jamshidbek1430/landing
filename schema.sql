-- SQLite Compatible Schema with Unique Constraint for Phone Numbers
CREATE TABLE IF NOT EXISTS click_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    page TEXT,
    x_percent REAL,
    y_percent REAL,
    x_px INTEGER,
    y_px INTEGER,
    element_tag TEXT,
    element_text TEXT,
    element_id TEXT,
    element_class TEXT,
    session_id TEXT,
    screen_width INTEGER,
    screen_height INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    event_type TEXT DEFAULT 'click',
    section TEXT
);

CREATE TABLE IF NOT EXISTS phone_submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    page TEXT,
    session_id TEXT,
    country_code TEXT,
    phone TEXT,
    phone_full TEXT UNIQUE, -- Ensures we don't store the same number twice
    user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_click_events_session_id ON click_events(session_id);
CREATE INDEX IF NOT EXISTS idx_phone_submissions_session_id ON phone_submissions(session_id);
