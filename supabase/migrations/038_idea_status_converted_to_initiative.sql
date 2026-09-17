-- 038: Rename the idea status "Converted to Startup" -> "Converted to Initiative".
-- Updates existing submissions and their recorded status history.

UPDATE ideas
   SET status = 'Converted to Initiative'
 WHERE status = 'Converted to Startup';

UPDATE idea_status_history
   SET from_status = 'Converted to Initiative'
 WHERE from_status = 'Converted to Startup';

UPDATE idea_status_history
   SET to_status = 'Converted to Initiative'
 WHERE to_status = 'Converted to Startup';
