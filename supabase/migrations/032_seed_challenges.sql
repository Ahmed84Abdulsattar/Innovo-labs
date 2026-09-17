-- Migration 032: Seed the 7 built-in challenges (version-controlled, reproducible).
--
-- These used to live as a STATIC_CHALLENGES array in the app code (dead — the app
-- reads challenges from the DB) and as hand-inserted rows that existed only because
-- someone ran an INSERT once. This makes the defaults part of source control so a
-- fresh database comes up with them.
--
-- Inserted as normal admin-managed rows (is_custom = TRUE) so they can be edited
-- AND deleted from the app. GUARDED with WHERE NOT EXISTS so it seeds ONLY a
-- completely empty challenges table — on a database that already has challenges it
-- inserts nothing and leaves existing rows untouched.

INSERT INTO challenges
  (id, number, title, short_description, overview,
   key_challenges, innovation_opportunities, business_impact,
   use_cases, strategic_focus_areas, is_custom)
SELECT v.id, v.number, v.title, v.short_description, v.overview,
       v.key_challenges, v.innovation_opportunities, v.business_impact,
       v.use_cases, v.strategic_focus_areas, TRUE
FROM (VALUES
  (
    'modernizing-construction', 1,
    'Modernizing Construction Methods',
    'Shifting toward industrialized, technology-enabled, and manufacturing-inspired approaches.',
    'Innovo still relies heavily on traditional, fragmented, and labor-intensive delivery models. Modernizing construction methods focuses on shifting toward industrialized, technology-enabled, and manufacturing-inspired approaches.',
    ARRAY['Slow adoption of modular and prefabricated construction','Resistance to changing conventional workflows','Limited standardization across projects','Low interoperability between tools, trades, and suppliers','High waste and inefficiency in on-site execution']::text[],
    ARRAY['Offsite manufacturing and modular construction to reduce site work and improve quality consistency','DfMA (Design for Manufacturing and Assembly) to simplify construction and reduce rework','Robotics and autonomous equipment for repetitive tasks','Digital twins and simulation models for optimized planning and execution','Lean construction methodologies to reduce waste and improve productivity']::text[],
    ARRAY['Faster project delivery','Improved quality control','Lower material waste','Reduced safety incidents','Greater scalability and repeatability']::text[],
    ARRAY[]::text[], ARRAY[]::text[]
  ),
  (
    'bim-value', 2,
    'BIM Value Beyond Design and Technical Coordination',
    $$Unlocking BIM's full lifecycle value across construction, operations, asset management, and decision-making.$$,
    $$Building Information Modeling (BIM) is often underutilized as merely a design coordination tool. Innovo's challenge is unlocking BIM's full lifecycle value across construction, operations, asset management, and decision-making.$$,
    ARRAY['BIM data becomes static after design completion','Poor integration between BIM and site operations','Limited use of BIM for facilities management','Fragmented data ownership across stakeholders','Difficulty converting BIM data into operational intelligence']::text[],
    ARRAY['4D and 5D BIM integrating schedule and cost data','Connected BIM platforms tied to procurement, logistics, and field execution','Digital twin ecosystems that update in real time from IoT and site data','AI-powered clash prediction and risk analysis','Asset lifecycle management using BIM data']::text[],
    ARRAY['Better project visibility','Improved cost forecasting','Enhanced operational maintenance','Reduced lifecycle costs','Stronger owner engagement and asset intelligence']::text[],
    ARRAY[]::text[], ARRAY[]::text[]
  ),
  (
    'reducing-labor-dependency', 3,
    'Reducing Labor Dependency',
    'Addressing persistent labor shortages and increasing project complexity through automation and technology.',
    'Innovo industry faces persistent labor shortages, aging workforces, and increasing project complexity. Reducing dependency on manual labor is becoming critical for long-term sustainability.',
    ARRAY['Skilled labor shortages','High turnover rates','Increasing labor costs','Productivity variability between crews','Heavy reliance on subcontractor availability']::text[],
    ARRAY['Automation of repetitive construction activities','Robotics for bricklaying, welding, rebar tying, and inspection','Exoskeletons and wearable technologies','Prefabrication and modularization','AI-driven workforce planning','Remote operations and telematics-enabled machinery']::text[],
    ARRAY['Higher productivity per worker','Reduced project delays','Improved worker safety','Lower operational risk','More predictable labor planning']::text[],
    ARRAY[]::text[], ARRAY[]::text[]
  ),
  (
    'data-intelligence-forecasting', 4,
    'Data Intelligence and Forecasting',
    'Transforming disconnected project data into predictive intelligence for better decision-making.',
    'Innovo generates massive amounts of data, but much of it remains disconnected, unused, or reactive. The challenge is transforming project data into predictive intelligence.',
    ARRAY['Siloed project systems and inconsistent data formats','Limited real-time analytics capability','Reactive rather than predictive decision-making','Poor forecasting accuracy for cost and schedule','Inability to identify early risk indicators']::text[],
    ARRAY['AI and machine learning for predictive analytics','Integrated project data platforms','Real-time dashboards and executive reporting','Risk forecasting models','Computer vision for progress tracking','Benchmarking engines using historical project data']::text[],
    ARRAY['Faster decision-making','Improved project predictability','Better risk management']::text[],
    ARRAY['Predicting schedule slippage','Forecasting procurement delays','Identifying cost overrun risks','Detecting safety trends','Optimizing resource allocation']::text[],
    ARRAY[]::text[]
  ),
  (
    'process-automation', 5,
    'Accelerating Process Automation',
    'Digitizing and streamlining repetitive operational tasks to reduce manual workflows.',
    'Innovo workflows still depend on spreadsheets, emails, manual approvals, and disconnected systems. Process automation aims to digitize and streamline repetitive operational tasks.',
    ARRAY['Manual approvals and document handling','Repetitive administrative processes','Fragmented ERP and project systems','Slow information flow between office and field','High dependency on human coordination']::text[],
    ARRAY['Workflow automation platforms','RPA (Robotic Process Automation) for finance, procurement, and compliance','AI assistants for document review and reporting','Automated submittals and RFIs','Smart contracts and blockchain-enabled approvals','Integrated digital permit and inspection systems']::text[],
    ARRAY['Reduced administrative overhead','Faster project workflows','Fewer human errors','Improved compliance tracking','Increased operational efficiency']::text[],
    ARRAY[]::text[], ARRAY[]::text[]
  ),
  (
    'real-time-site-operations', 6,
    'Real-Time Site Operations & Smart Logistics',
    'Creating connected, intelligent jobsites with real-time visibility into materials, equipment, and workforce.',
    'Innovo construction sites are dynamic environments where delays often result from poor visibility into materials, equipment, workforce movement, and site conditions. Real-time operations seek to create connected, intelligent jobsites.',
    ARRAY['Material delivery uncertainty','Equipment underutilization','Lack of real-time progress visibility','Poor coordination between trades','Inefficient site logistics and storage management']::text[],
    ARRAY['IoT-enabled smart sites','RFID and GPS tracking for materials and equipment','Drone-based site monitoring','Computer vision for safety and progress analysis','Digital logistics control towers','Autonomous delivery and inventory systems']::text[],
    ARRAY['Reduced material delays','Higher equipment utilization','Improved site safety','Better trade coordination','Lower logistics costs']::text[],
    ARRAY['Tracking concrete delivery timing','Monitoring equipment utilization','Optimizing crane scheduling','Live workforce density analysis','Automated safety compliance monitoring']::text[],
    ARRAY[]::text[]
  ),
  (
    'workforce-skills', 7,
    'Workforce, Skills and Subcontractor Experience',
    'Rethinking how Innovo attracts, develops, and retains talent while improving subcontractor collaboration.',
    'Innovo must rethink how it attracts, develops, and retains talent while improving collaboration with subcontractors who perform most project work.',
    ARRAY['Aging workforce and talent shortages','Limited digital skills among field workers','Fragmented subcontractor communication','Poor onboarding and training experiences','High stress and burnout across project teams']::text[],
    ARRAY['Digital learning and upskilling platforms','AR/VR training simulations','Mobile-first field collaboration tools','Subcontractor experience platforms','AI-based workforce matching and planning','Gamified safety and productivity programs']::text[],
    ARRAY['Higher workforce retention','Faster onboarding','Improved subcontractor collaboration']::text[],
    ARRAY[]::text[],
    ARRAY['Improving worker engagement','Simplifying field communication','Standardizing subcontractor onboarding','Building digital competencies','Creating safer and more inclusive work environments']::text[]
  )
) AS v(id, number, title, short_description, overview,
       key_challenges, innovation_opportunities, business_impact,
       use_cases, strategic_focus_areas)
WHERE NOT EXISTS (SELECT 1 FROM challenges);
