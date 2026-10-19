CREATE TABLE IF NOT EXISTS remember_credentials (
  id CHAR(64) PRIMARY KEY,
  user_id INT NOT NULL,
  token_hash CHAR(64) NOT NULL,
  previous_hash CHAR(64) NULL,
  previous_until DATETIME(3) NULL,
  credential_version CHAR(64) NOT NULL,
  role VARCHAR(50) NOT NULL,
  created_at DATETIME(3) NOT NULL,
  expires_at DATETIME(3) NOT NULL,
  last_used_at DATETIME(3) NULL,
  revoked_at DATETIME(3) NULL,
  INDEX remember_user_idx (user_id),
  INDEX remember_expiry_idx (expires_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;
