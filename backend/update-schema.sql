-- Add new columns to errors table for priority and AI resolution
ALTER TABLE errors 
ADD COLUMN priority ENUM('P0', 'P1', 'P2', 'P3') DEFAULT 'P2' AFTER error_type,
ADD COLUMN ai_resolution_status ENUM('not_started', 'analyzing', 'resolving', 'resolved', 'failed', 'manual_required') DEFAULT 'not_started',
ADD COLUMN ai_resolution_steps JSON,
ADD COLUMN resolved_at TIMESTAMP NULL,
ADD INDEX idx_priority (priority),
ADD INDEX idx_ai_status (ai_resolution_status);

SELECT 'Database schema updated successfully!' as status;
