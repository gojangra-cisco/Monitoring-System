-- Create monitoring user
CREATE USER IF NOT EXISTS 'monitoring_user'@'localhost' IDENTIFIED BY 'monitoring123';
GRANT ALL PRIVILEGES ON monitoring.* TO 'monitoring_user'@'localhost';
FLUSH PRIVILEGES;

-- Show success
SELECT 'User created successfully!' as status, 'monitoring_user' as username, 'monitoring123' as password;
