-- Schéma MariaDB de Subly. Idempotent : appliqué automatiquement au démarrage de l'API.

-- Comptes et sessions
CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) NOT NULL PRIMARY KEY,
  email VARCHAR(320) NOT NULL,
  password_hash VARCHAR(100) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT UTC_TIMESTAMP(3),
  UNIQUE KEY users_email_unique (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sessions (
  token_hash CHAR(64) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT UTC_TIMESTAMP(3),
  expires_at DATETIME(3) NOT NULL,
  KEY sessions_user_idx (user_id),
  CONSTRAINT sessions_user_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS email_tokens (
  token_hash CHAR(64) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  purpose ENUM('recovery', 'magic') NOT NULL,
  expires_at DATETIME(3) NOT NULL,
  KEY email_tokens_user_idx (user_id),
  CONSTRAINT email_tokens_user_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Catalogue partagé : lecture seule pour les utilisateurs connectés.
CREATE TABLE IF NOT EXISTS subscription_categories (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  label VARCHAR(255) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS subscription_provider_templates (
  id VARCHAR(128) NOT NULL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(64) NOT NULL,
  logo MEDIUMTEXT NOT NULL,
  website TEXT NULL,
  color VARCHAR(32) NULL,
  sort_order INT NOT NULL DEFAULT 0,
  CONSTRAINT templates_category_fk FOREIGN KEY (category) REFERENCES subscription_categories (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Données propres à chaque utilisateur (l'API filtre toujours par user_id).
CREATE TABLE IF NOT EXISTS subscription_providers (
  user_id CHAR(36) NOT NULL,
  id VARCHAR(128) NOT NULL,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(64) NOT NULL,
  logo MEDIUMTEXT NOT NULL,
  website TEXT NULL,
  color VARCHAR(32) NULL,
  updated_at DATETIME(3) NOT NULL DEFAULT UTC_TIMESTAMP(3),
  PRIMARY KEY (user_id, id),
  CONSTRAINT providers_user_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS subscriptions (
  user_id CHAR(36) NOT NULL,
  id VARCHAR(64) NOT NULL,
  provider_id VARCHAR(128) NULL,
  name VARCHAR(255) NOT NULL,
  logo MEDIUMTEXT NOT NULL,
  website TEXT NULL,
  category VARCHAR(64) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'EUR',
  cycle ENUM('weekly', 'monthly', 'quarterly', 'yearly') NOT NULL,
  start_date DATE NOT NULL,
  renewal_date DATE NOT NULL,
  expiration_date DATE NULL,
  status ENUM('active', 'trial', 'paused') NOT NULL,
  auto_renew BOOLEAN NOT NULL DEFAULT TRUE,
  remind_days JSON NOT NULL,
  notes TEXT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT UTC_TIMESTAMP(3),
  PRIMARY KEY (user_id, id),
  KEY subscriptions_user_renewal_idx (user_id, renewal_date),
  CONSTRAINT subscriptions_price_check CHECK (price >= 0),
  CONSTRAINT subscriptions_currency_check CHECK (currency = 'EUR'),
  CONSTRAINT subscriptions_remind_days_check CHECK (JSON_VALID(remind_days) AND JSON_TYPE(remind_days) = 'ARRAY'),
  CONSTRAINT subscriptions_user_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS subscription_settings (
  user_id CHAR(36) NOT NULL PRIMARY KEY,
  theme ENUM('dark', 'light') NOT NULL DEFAULT 'dark',
  reminders_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT settings_user_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
