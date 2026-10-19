CREATE TRIGGER users_revoke_remember AFTER UPDATE ON users FOR EACH ROW
UPDATE remember_credentials SET revoked_at = UTC_TIMESTAMP(3)
WHERE user_id = NEW.id AND revoked_at IS NULL
AND (NOT (OLD.password <=> NEW.password) OR NOT (OLD.role <=> NEW.role) OR NEW.account_status <> 'Active')
