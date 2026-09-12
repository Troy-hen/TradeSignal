create temporary table _b2b_taxonomy_seed (
  slug text primary key,
  name text not null,
  description text,
  category_group text not null,
  keywords text[] not null,
  markets text[] not null,
  need_slug text not null
) on commit drop;

with category_seed(slug,name,description,category_group,keywords) as (
  values
  ('general-builder','General Builder','General building contractors for commercial and public-sector works.','construction_property',array['construction works','building works','refurbishment','renovation','building extension','commercial refurbishment']::text[]),
  ('groundworks','Groundworks','Groundworks, drainage, excavation and civil engineering.','construction_property',array['groundworks','drainage','foundations','excavation','earthworks','site preparation']::text[]),
  ('roofing','Roofing','Commercial and domestic roofing, roof renewal and roofline works.','construction_property',array['roof','roofing','re-roofing','roof renewal','roof covering','rooflight']::text[]),
  ('structural-steel','Structural Steel','Structural steel, steel frames and metalwork packages.','construction_property',array['structural steel','steelwork','steel frame','metal framework','steel beam']::text[]),
  ('windows-doors','Windows & Doors','Windows, doors, glazing and fenestration.','construction_property',array['windows','doors','glazing','fenestration','curtain wall','replacement windows']::text[]),
  ('landscaping','Landscaping','Landscape, grounds, external works and public realm suppliers.','construction_property',array['landscaping','landscape','grounds works','external works','playground','hard landscaping']::text[]),
  ('electrical','Electrical','Electrical installation, lighting, fire alarm and power services.','construction_property',array['electrical','rewiring','lighting','fire alarm','power distribution','ev charging']::text[]),
  ('plumbing-heating','Plumbing & Heating','Plumbing, heating, mechanical and HVAC contractors.','construction_property',array['plumbing','heating','boiler','mechanical services','hvac','hot water']::text[]),
  ('brickwork','Brickwork','Brickwork, masonry, blockwork and repointing.','construction_property',array['brickwork','masonry','blockwork','repointing','pointing works']::text[]),
  ('demolition','Demolition','Demolition, strip-out, clearance and enabling works.','construction_property',array['demolition','strip out','site clearance','soft strip','removal of existing']::text[]),
  ('loft-conversion','Loft Conversion','Loft, attic and roof-space conversion specialists.','construction_property',array['loft conversion','attic conversion','roof space conversion','dormer conversion']::text[]),
  ('driveways','Driveways','Driveways, paving, surfacing and car-park works.','construction_property',array['driveway','paving','surfacing','resurfacing','car park','tarmac']::text[]),
  ('renewables','Renewables','Renewable energy, low-carbon and retrofit suppliers.','communications_utilities',array['solar','photovoltaic','heat pump','renewable','battery storage','decarbonisation']::text[]),
  ('fit-out-interiors','Fit-out & Interiors','Commercial fit-out, shopfitting and interior refurbishment.','premises_facilities',array['fit out','fit-out','shop fitting','shopfitting','interior refurbishment','workplace refurbishment']::text[]),
  ('accountancy-finance','Accountancy and finance','Accountancy, tax, bookkeeping, payroll and finance suppliers.','finance_operations',array['accountancy','accounting','bookkeeping','tax','payroll','finance']::text[]),
  ('broadband-connectivity','Broadband and connectivity','Business broadband, leased lines, Wi-Fi and connectivity.','communications_utilities',array['broadband','connectivity','leased line','wifi','internet','business phone']::text[]),
  ('commercial-cleaning-facilities','Commercial cleaning and facilities','Commercial cleaning, waste, pest and facilities services.','premises_facilities',array['commercial cleaning','facilities management','waste management','pest control','janitorial','caretaking']::text[]),
  ('commercial-kitchen-equipment','Commercial kitchen and extraction','Commercial kitchens, extraction and food-service equipment.','sector_specialist',array['commercial kitchen','catering equipment','extraction','food service','restaurant equipment','kitchen installation']::text[]),
  ('epos-payments','EPOS and payments','EPOS, payment processing, tills and digital ordering.','software_technology',array['epos','point of sale','payment processing','card terminal','till','digital ordering']::text[]),
  ('hr-payroll-recruitment','HR, payroll and recruitment','HR, recruitment, payroll and people operations.','professional_advisory',array['hr','human resources','recruitment','payroll','staffing','people operations']::text[]),
  ('managed-it-services','Managed IT services','Managed IT, cyber, cloud and technology support.','software_technology',array['managed it','it support','cyber security','cloud services','technology support','helpdesk']::text[]),
  ('office-workplace-furniture','Office and workplace furniture','Office furniture, workplace design and furniture supply.','premises_facilities',array['office furniture','workplace furniture','desks','office fit out','workplace design','commercial furniture']::text[]),
  ('security-access-control','Security and access control','CCTV, alarms, access control and physical security.','premises_facilities',array['cctv','security','access control','alarm','monitoring','intruder detection']::text[]),
  ('signage-branding','Signage and branding','Signage, wayfinding, graphics and environmental branding.','digital_marketing',array['signage','wayfinding','branding','graphics','shop signs','vehicle graphics']::text[]),
  ('solar-ev-charging','Solar and EV charging','Solar, battery, EV charging and commercial energy infrastructure.','communications_utilities',array['solar pv','ev charging','battery storage','electric vehicle','renewable energy','charging point']::text[]),
  ('web-design-development','Web design and development','Web design, web development, websites and digital presence projects.','digital_marketing',array['web design','website design','web development','website development','website redesign','web portal']::text[]),
  ('ecommerce-development','Ecommerce development','Ecommerce stores, online ordering and digital commerce builds.','digital_marketing',array['ecommerce','e-commerce','online shop','online ordering','shopping platform','commerce website']::text[]),
  ('website-maintenance-hosting','Website maintenance and hosting','Website support, hosting, domains, maintenance and performance.','digital_marketing',array['website maintenance','website support','web hosting','domain','site maintenance','website performance']::text[]),
  ('seo-local-search','SEO and local search','Search engine optimisation, local search and visibility services.','digital_marketing',array['seo','search engine optimisation','local search','google business profile','organic search','search visibility']::text[]),
  ('digital-marketing','Digital marketing','Paid, organic and performance marketing for B2B and consumer businesses.','digital_marketing',array['digital marketing','online marketing','paid search','ppc','performance marketing','lead generation']::text[]),
  ('social-media-marketing','Social media marketing','Social media strategy, content, campaigns and community management.','digital_marketing',array['social media','social marketing','instagram','facebook marketing','linkedin marketing','community management']::text[]),
  ('content-copywriting','Content and copywriting','Website copy, editorial content, case studies and commercial writing.','digital_marketing',array['copywriting','content marketing','website copy','blog content','case study','editorial content']::text[]),
  ('email-marketing','Email marketing','Email campaigns, lifecycle marketing, newsletters and automation.','digital_marketing',array['email marketing','newsletter','marketing automation','lifecycle marketing','crm campaigns','email campaign']::text[]),
  ('branding-creative','Branding and creative','Brand strategy, identity, creative direction and campaign design.','digital_marketing',array['branding','brand identity','creative agency','rebrand','visual identity','brand strategy']::text[]),
  ('graphic-design','Graphic design','Graphic design, artwork, presentations and campaign assets.','digital_marketing',array['graphic design','design artwork','marketing collateral','presentation design','creative artwork','illustration']::text[]),
  ('public-relations','Public relations and media','PR, media relations, communications and reputation support.','digital_marketing',array['public relations','pr agency','media relations','press office','communications','reputation management']::text[]),
  ('print-promotional','Print and promotional materials','Print, promotional merchandise, displays and branded materials.','digital_marketing',array['print','printing','promotional merchandise','branded merchandise','display materials','signage print']::text[]),
  ('photography-video','Photography and video','Commercial photography, video, production and content capture.','digital_marketing',array['commercial photography','videography','video production','product photography','content production','drone photography']::text[]),
  ('market-research','Market research','Customer research, competitor intelligence, surveys and market sizing.','professional_advisory',array['market research','customer research','competitor research','surveys','market analysis','customer insight']::text[]),
  ('events-experiences','Events and experiences','Events, exhibitions, launches, activations and experiential marketing.','sector_specialist',array['events','event management','exhibition','trade show','brand activation','launch event']::text[]),
  ('crm-software','CRM software','Customer relationship management platforms and implementation.','software_technology',array['crm','customer relationship management','sales pipeline','customer database','contact management']::text[]),
  ('erp-business-management','ERP and business management software','ERP, business management, operations and integrated systems.','software_technology',array['erp','business management software','enterprise resource planning','business system','operations software']::text[]),
  ('accounting-software','Accounting software','Cloud accounting, invoicing, finance systems and integrations.','software_technology',array['accounting software','bookkeeping software','invoicing software','finance system','xero','sage']::text[]),
  ('booking-reservation-software','Booking and reservation software','Online booking, reservations, appointments and scheduling systems.','software_technology',array['booking software','reservation system','appointment booking','online reservations','scheduling software']::text[]),
  ('ecommerce-platforms','Ecommerce platforms','Ecommerce platforms, online ordering systems and retail commerce software.','software_technology',array['ecommerce platform','online store platform','shopping cart','online ordering system','commerce software']::text[]),
  ('hr-payroll-software','HR and payroll software','HRIS, payroll, workforce management and people systems.','software_technology',array['hr software','payroll software','hris','workforce management','people system']::text[]),
  ('project-management-software','Project management software','Project, task, resource and delivery management systems.','software_technology',array['project management software','task management','resource planning','delivery management','project system']::text[]),
  ('document-management','Document management','Document, records, knowledge and information management systems.','software_technology',array['document management','records management','knowledge management','digital records','document system']::text[]),
  ('workflow-automation','Workflow automation','Workflow, process automation and low-code business systems.','software_technology',array['workflow automation','process automation','low code','no code','business automation','workflow software']::text[]),
  ('data-analytics-bi','Data analytics and BI','Business intelligence, reporting, dashboards and data engineering.','software_technology',array['business intelligence','data analytics','reporting dashboard','data warehouse','management information','bi platform']::text[]),
  ('cyber-security','Cyber security','Cyber security, risk assessment, monitoring and resilience.','software_technology',array['cyber security','cybersecurity','information security','penetration testing','security monitoring','iso 27001']::text[]),
  ('cloud-computing','Cloud computing','Cloud migration, infrastructure, hosting and platform services.','software_technology',array['cloud computing','cloud migration','cloud infrastructure','hosting platform','aws','azure']::text[]),
  ('software-development','Software development','Bespoke software, integrations, APIs and product engineering.','software_technology',array['software development','bespoke software','api development','systems integration','custom platform','software build']::text[]),
  ('app-development','App development','Mobile applications, portals and customer-facing digital products.','software_technology',array['app development','mobile app','ios app','android app','customer portal','mobile application']::text[]),
  ('ai-automation','AI and automation','Applied AI, intelligent automation, assistants and workflow augmentation.','software_technology',array['artificial intelligence','ai automation','machine learning','generative ai','intelligent automation','ai assistant']::text[]),
  ('telecoms-voip','Telecoms and VoIP','Business telephony, VoIP, unified communications and call systems.','communications_utilities',array['voip','business telephony','hosted phone','unified communications','call system','sip trunk']::text[]),
  ('mobile-business','Business mobile','Business mobile, device fleets, connectivity and mobile management.','communications_utilities',array['business mobile','mobile phones','device management','mobile connectivity','sim cards','mobile fleet']::text[]),
  ('website-accessibility','Website accessibility and compliance','Accessibility audits, remediation and compliant digital experiences.','software_technology',array['website accessibility','wcag','accessibility audit','accessible website','digital compliance']::text[]),
  ('digital-signature','Digital signature and identity','E-signature, digital identity, verification and secure document workflows.','software_technology',array['e-signature','digital signature','electronic signature','identity verification','document signing']::text[]),
  ('business-consulting','Business consulting','Business strategy, operating models and commercial improvement.','professional_advisory',array['business consulting','business strategy','operating model','commercial improvement','growth strategy']::text[]),
  ('management-consulting','Management consulting','Management, transformation, performance and organisational consulting.','professional_advisory',array['management consulting','transformation consulting','operational performance','organisational change','business transformation']::text[]),
  ('technology-consulting','Technology consulting','Technology strategy, architecture, transformation and vendor advisory.','professional_advisory',array['technology consulting','it strategy','technology strategy','digital transformation','enterprise architecture']::text[]),
  ('financial-advisory','Financial advisory','Financial planning, modelling, transaction and corporate finance advice.','professional_advisory',array['financial advisory','corporate finance','financial modelling','business finance advice','transaction advisory']::text[]),
  ('commercial-law','Commercial law','Commercial contracts, corporate, property and business legal advice.','professional_advisory',array['commercial law','business solicitor','commercial contracts','corporate law','legal advice']::text[]),
  ('employment-law','Employment law','Employment, HR, contracts, disputes and workplace legal advice.','professional_advisory',array['employment law','employment solicitor','hr legal advice','employment contracts','workplace dispute']::text[]),
  ('commercial-insurance','Commercial insurance','Commercial insurance, liability, property and specialist business cover.','professional_advisory',array['commercial insurance','business insurance','liability insurance','property insurance','professional indemnity']::text[]),
  ('health-safety-consulting','Health and safety consulting','Health and safety audits, policies, training and compliance.','professional_advisory',array['health and safety','health safety consultant','risk assessment','safety audit','safety training']::text[]),
  ('compliance-risk','Compliance and risk','Compliance, governance, risk, regulatory and audit-readiness services.','professional_advisory',array['compliance','risk management','governance','regulatory compliance','risk assessment','audit readiness']::text[]),
  ('procurement-consulting','Procurement consulting','Procurement strategy, tendering, supplier management and commercial sourcing.','professional_advisory',array['procurement consulting','procurement strategy','tender management','supplier management','commercial sourcing']::text[]),
  ('sustainability-consulting','Sustainability consulting','Carbon, ESG, net zero, sustainability strategy and reporting.','professional_advisory',array['sustainability consulting','esg','net zero','carbon reporting','environmental strategy']::text[]),
  ('recruitment-executive-search','Recruitment and executive search','Permanent recruitment, executive search and specialist hiring.','professional_advisory',array['recruitment','executive search','talent acquisition','permanent staffing','specialist recruitment']::text[]),
  ('training-learning','Training and learning','Professional training, skills, learning design and workforce development.','professional_advisory',array['training','learning and development','professional development','workforce training','skills training']::text[]),
  ('leadership-coaching','Leadership coaching','Leadership, management coaching and team development.','professional_advisory',array['leadership coaching','executive coaching','management coaching','team development','leadership development']::text[]),
  ('translation-interpretation','Translation and interpretation','Translation, interpretation, localisation and multilingual support.','professional_advisory',array['translation','interpretation','localisation','multilingual services','language services']::text[]),
  ('outsourced-sales','Outsourced sales','Sales development, appointment setting and outsourced commercial teams.','professional_advisory',array['outsourced sales','sales development','appointment setting','business development','sales team']::text[]),
  ('customer-experience-consulting','Customer experience consulting','Customer journey, service design and customer experience improvement.','professional_advisory',array['customer experience','service design','customer journey','cx consulting','customer service improvement']::text[]),
  ('bookkeeping','Bookkeeping','Bookkeeping, management accounts and day-to-day finance operations.','finance_operations',array['bookkeeping','management accounts','bookkeeper','finance operations','accounts processing']::text[]),
  ('tax-advisory','Tax advisory','Corporate, VAT, payroll and specialist tax advice.','finance_operations',array['tax adviser','tax advisory','vat advice','corporation tax','tax planning']::text[]),
  ('payroll-services','Payroll services','Managed payroll, pensions, expenses and payroll compliance.','finance_operations',array['payroll services','outsourced payroll','pension administration','payroll bureau','payroll processing']::text[]),
  ('commercial-finance','Commercial finance','Business loans, asset finance, invoice finance and working capital.','finance_operations',array['commercial finance','business loan','asset finance','invoice finance','working capital']::text[]),
  ('debt-recovery','Debt recovery and credit control','Credit control, collections, debt recovery and cash-flow support.','finance_operations',array['debt recovery','credit control','commercial collections','late payment','debt collection']::text[]),
  ('outsourced-back-office','Outsourced back office','Outsourced administration, finance support and back-office operations.','finance_operations',array['outsourced back office','back office support','admin outsourcing','shared services','virtual back office']::text[]),
  ('virtual-assistant','Virtual assistant services','Virtual assistants, executive support and remote administration.','finance_operations',array['virtual assistant','virtual assistant services','remote administration','executive assistant','administrative support']::text[]),
  ('merchant-services','Merchant services','Merchant acquiring, card processing, payment acceptance and settlement.','finance_operations',array['merchant services','card processing','payment acceptance','merchant acquiring','payment provider']::text[]),
  ('business-process-outsourcing','Business process outsourcing','Outsourced customer operations, administration and process delivery.','finance_operations',array['business process outsourcing','bpo','outsourced operations','customer operations','process outsourcing']::text[]),
  ('company-secretarial','Company secretarial','Company secretarial, statutory filings and governance administration.','finance_operations',array['company secretarial','statutory filing','registered office service','corporate governance','companies house filing']::text[]),
  ('insolvency-restructuring','Insolvency and restructuring','Insolvency, turnaround, restructuring and business recovery advice.','finance_operations',array['insolvency','business restructuring','turnaround advice','business recovery','administration advice']::text[]),
  ('audit-assurance','Audit and assurance','Audit, assurance, controls testing and financial reporting.','finance_operations',array['audit','assurance','statutory audit','internal audit','financial reporting']::text[]),
  ('credit-risk','Credit risk and intelligence','Credit checking, risk intelligence, due diligence and monitoring.','finance_operations',array['credit risk','credit checking','business due diligence','credit monitoring','risk intelligence']::text[]),
  ('grants-funding-advice','Grants and funding advice','Grant applications, funding strategy and public funding support.','finance_operations',array['grant funding','grant application','funding advice','innovation funding','business grants']::text[]),
  ('interior-design','Interior design','Interior architecture, space planning and workplace design.','premises_facilities',array['interior design','space planning','interior architecture','workplace design','commercial interiors']::text[]),
  ('office-supplies','Office supplies','Stationery, consumables, workplace supplies and recurring office procurement.','premises_facilities',array['office supplies','stationery','workplace supplies','office consumables','business supplies']::text[]),
  ('office-equipment','Office equipment','Printers, copiers, AV, meeting-room and workplace equipment.','premises_facilities',array['office equipment','printer','copier','meeting room equipment','av equipment']::text[]),
  ('waste-recycling','Waste and recycling','Commercial waste, recycling, secure destruction and resource recovery.','premises_facilities',array['waste management','commercial waste','recycling','secure destruction','waste collection']::text[]),
  ('pest-control','Pest control','Commercial pest prevention, control and compliance.','premises_facilities',array['pest control','commercial pest','rodent control','bird control','pest prevention']::text[]),
  ('facilities-management','Facilities management','Integrated facilities, planned maintenance and workplace operations.','premises_facilities',array['facilities management','fm services','planned maintenance','hard facilities','soft facilities']::text[]),
  ('fire-safety','Fire safety','Fire risk, alarms, suppression, compliance and emergency systems.','premises_facilities',array['fire safety','fire alarm','fire risk assessment','fire protection','fire suppression']::text[]),
  ('hvac-air-conditioning','HVAC and air conditioning','Heating, ventilation, air conditioning and indoor air quality.','premises_facilities',array['hvac','air conditioning','ventilation','indoor air quality','mechanical ventilation']::text[]),
  ('lifts-accessibility','Lifts and accessibility','Lifts, access, accessibility adaptations and inclusive premises.','premises_facilities',array['lift installation','lift maintenance','accessibility','disabled access','platform lift']::text[]),
  ('building-maintenance','Building maintenance','Planned, reactive and fabric maintenance for commercial properties.','premises_facilities',array['building maintenance','property maintenance','reactive maintenance','fabric maintenance','commercial repairs']::text[]),
  ('property-management','Property management','Commercial property, estates, lease and building management.','premises_facilities',array['property management','commercial property management','estate management','building management','property services']::text[]),
  ('uniforms-workwear','Uniforms and workwear','Uniforms, PPE, branded workwear and workforce clothing.','premises_facilities',array['uniforms','workwear','ppe','branded clothing','corporate clothing']::text[]),
  ('vending-catering','Vending and workplace catering','Vending, catering, refreshments and workplace food services.','sector_specialist',array['vending','workplace catering','office catering','refreshments','food service']::text[]),
  ('workplace-wellbeing','Workplace health and wellbeing','Occupational health, wellbeing, ergonomics and employee support.','professional_advisory',array['workplace wellbeing','occupational health','employee wellbeing','ergonomics','employee assistance']::text[]),
  ('water-hygiene','Water hygiene','Legionella, water testing, hygiene and commercial water compliance.','premises_facilities',array['water hygiene','legionella','water testing','water compliance','water treatment']::text[]),
  ('commercial-vehicle-fleet','Commercial vehicles and fleet','Commercial vehicles, fleet supply, leasing and vehicle services.','supply_chain_logistics',array['commercial vehicles','fleet','vehicle leasing','business vans','fleet services']::text[]),
  ('relocation-services','Relocation services','Office moves, removals, relocation planning and setup.','supply_chain_logistics',array['office relocation','office move','commercial removals','business relocation','move management']::text[]),
  ('energy-supply','Energy supply','Commercial electricity, gas, supply contracts and energy procurement.','communications_utilities',array['energy supply','business electricity','commercial gas','energy procurement','utility contract']::text[]),
  ('energy-consulting','Energy consulting','Energy audits, procurement advice, carbon and efficiency planning.','communications_utilities',array['energy consulting','energy audit','energy procurement advice','energy strategy','utility consultancy']::text[]),
  ('energy-efficiency','Energy efficiency','Energy efficiency, retrofit, insulation and building performance.','communications_utilities',array['energy efficiency','energy saving','retrofit','insulation','building performance']::text[]),
  ('building-controls-bms','Building controls and BMS','Building management systems, metering, controls and smart estates.','communications_utilities',array['building management system','bms','building controls','smart building','energy monitoring']::text[]),
  ('telecoms-infrastructure','Telecoms infrastructure','Structured cabling, telecoms infrastructure, Wi-Fi and network rollout.','communications_utilities',array['telecoms infrastructure','structured cabling','network installation','wifi installation','data cabling']::text[]),
  ('water-services','Commercial water services','Commercial water supply, treatment, metering and efficiency.','communications_utilities',array['commercial water','water supply','water treatment','water metering','water efficiency']::text[]),
  ('logistics-courier','Logistics and courier services','B2B delivery, courier, freight, transport and logistics.','supply_chain_logistics',array['logistics','courier','freight','transport services','same day delivery']::text[]),
  ('warehousing-storage','Warehousing and storage','Warehousing, storage, fulfilment space and inventory handling.','supply_chain_logistics',array['warehousing','storage','fulfilment warehouse','3pl','inventory storage']::text[]),
  ('packaging','Packaging','Product, transit, sustainable and bespoke packaging.','supply_chain_logistics',array['packaging','product packaging','transit packaging','sustainable packaging','packaging supply']::text[]),
  ('wholesale-supplies','Wholesale supplies','Wholesale goods, trade supplies and business consumables.','supply_chain_logistics',array['wholesale supplies','trade supplies','business consumables','wholesale distribution','bulk supplies']::text[]),
  ('industrial-equipment','Industrial equipment','Industrial machinery, plant, tools and operational equipment.','supply_chain_logistics',array['industrial equipment','industrial machinery','plant equipment','production equipment','workshop equipment']::text[]),
  ('import-export','Import and export services','Import, export, customs, freight forwarding and trade compliance.','supply_chain_logistics',array['import export','customs','freight forwarding','international trade','trade compliance']::text[]),
  ('fulfilment','Fulfilment services','Pick, pack, dispatch, returns and outsourced fulfilment.','supply_chain_logistics',array['order fulfilment','fulfilment services','pick and pack','dispatch','returns management']::text[]),
  ('supply-chain-consulting','Supply chain consulting','Supply chain design, procurement, inventory and operational improvement.','supply_chain_logistics',array['supply chain consulting','inventory planning','procurement operations','supply chain strategy','operations improvement']::text[]),
  ('fleet-management','Fleet management','Fleet tracking, compliance, routing and vehicle operations.','supply_chain_logistics',array['fleet management','vehicle tracking','fleet compliance','route planning','fleet operations']::text[]),
  ('hospitality-operations','Hospitality operations','Hospitality opening, operating model, menu and venue support.','sector_specialist',array['hospitality operations','restaurant operations','venue operations','hospitality consultancy','opening support']::text[]),
  ('healthcare-supplies','Healthcare supplies','Healthcare, clinical, care and medical consumables.','sector_specialist',array['healthcare supplies','clinical supplies','medical consumables','care supplies','healthcare equipment']::text[]),
  ('medical-dental-equipment','Medical and dental equipment','Medical, dental, diagnostic and treatment equipment.','sector_specialist',array['medical equipment','dental equipment','diagnostic equipment','clinical equipment','treatment equipment']::text[]),
  ('care-operations','Care operations','Care operations, compliance, staffing and service delivery.','sector_specialist',array['care operations','care provider','care service','social care','care management']::text[]),
  ('retail-systems','Retail systems','Retail technology, merchandising, checkout and store systems.','sector_specialist',array['retail systems','retail technology','checkout system','merchandising','store systems']::text[]),
  ('manufacturing-equipment','Manufacturing equipment','Manufacturing, fabrication, production and process equipment.','sector_specialist',array['manufacturing equipment','production line','fabrication equipment','factory equipment','process equipment']::text[]),
  ('industrial-services','Industrial services','Industrial maintenance, engineering, testing and specialist services.','sector_specialist',array['industrial services','industrial maintenance','engineering services','inspection services','plant maintenance']::text[]),
  ('education-supplies','Education supplies','Education equipment, classroom, learning and school supplies.','sector_specialist',array['education supplies','school supplies','classroom equipment','learning resources','education equipment']::text[]),
  ('laboratory-scientific','Laboratory and scientific services','Laboratory equipment, testing, research and scientific supplies.','sector_specialist',array['laboratory equipment','scientific equipment','laboratory services','testing services','research supplies']::text[]),
  ('construction-project-management','Construction project management','Construction management, programme delivery and principal contractor support.','sector_specialist',array['construction project management','project management construction','principal contractor','construction management','programme management']::text[]),
  ('quantity-surveying','Quantity surveying','Cost planning, quantity surveying, commercial management and estimating.','professional_advisory',array['quantity surveying','cost planning','construction cost','commercial management','estimating']::text[]),
  ('architecture-design','Architecture and design','Architecture, building design, planning and technical design.','professional_advisory',array['architect','architecture','building design','technical design','architectural services']::text[]),
  ('commercial-property-advisory','Commercial property advisory','Commercial property, development, valuation and agency advice.','professional_advisory',array['commercial property advisory','property valuation','property development advice','commercial property agent','development consultancy']::text[]),
  ('environmental-services','Environmental services','Environmental assessment, remediation, ecology and waste advice.','sector_specialist',array['environmental services','environmental assessment','ecology','contamination','environmental consultancy']::text[]),
  ('foodservice-supplies','Foodservice supplies','Food, beverage, catering and hospitality supply chains.','sector_specialist',array['foodservice supplies','catering supplies','food wholesale','beverage supply','hospitality supplies']::text[]),
  ('agricultural-business-services','Agricultural business services','Agricultural, land management and rural business services.','sector_specialist',array['agricultural services','farm services','land management','rural business','agri services']::text[])
)
insert into _b2b_taxonomy_seed(slug,name,description,category_group,keywords,markets,need_slug)
select slug,name,description,category_group,keywords,
  case category_group
    when 'digital_marketing' then array['hospitality_openings','moves_fitouts','care_health','commercial_energy','growing_businesses','public_contracts']::text[]
    when 'software_technology' then array['hospitality_openings','moves_fitouts','care_health','commercial_energy','growing_businesses','public_contracts']::text[]
    when 'professional_advisory' then array['hospitality_openings','moves_fitouts','care_health','commercial_energy','growing_businesses','public_contracts']::text[]
    when 'finance_operations' then array['hospitality_openings','moves_fitouts','care_health','commercial_energy','growing_businesses','public_contracts']::text[]
    when 'premises_facilities' then array['hospitality_openings','moves_fitouts','care_health','commercial_energy','growing_businesses','public_contracts']::text[]
    when 'communications_utilities' then array['hospitality_openings','moves_fitouts','care_health','commercial_energy','growing_businesses','public_contracts']::text[]
    when 'supply_chain_logistics' then array['hospitality_openings','moves_fitouts','care_health','growing_businesses','public_contracts']::text[]
    when 'sector_specialist' then array['hospitality_openings','moves_fitouts','care_health','commercial_energy','growing_businesses','public_contracts']::text[]
    else array['hospitality_openings','moves_fitouts','care_health','commercial_energy','growing_businesses','public_contracts']::text[]
  end,
  case slug
    when 'epos-payments' then 'epos_payments'
    when 'managed-it-services' then 'managed_it_services'
    when 'broadband-connectivity' then 'broadband_connectivity'
    when 'accountancy-finance' then 'accountancy_finance'
    when 'office-workplace-furniture' then 'office_workplace_furniture'
    when 'signage-branding' then 'signage_branding'
    when 'security-access-control' then 'security_access_control'
    when 'commercial-cleaning-facilities' then 'commercial_cleaning_facilities'
    when 'hr-payroll-recruitment' then 'hr_payroll_recruitment'
    when 'commercial-kitchen-equipment' then 'commercial_kitchen_equipment'
    when 'solar-ev-charging' then 'solar_ev_charging'
    when 'fit-out-interiors' then 'commercial_fit_out'
    else replace(slug,'-','_')
  end
from category_seed;
insert into public.trade_categories(slug,name,description,default_monthly_price_pence,ai_detection_hints,display_order,is_active)
select slug,name,description,2999,jsonb_build_object('keywords',keywords),1000+row_number() over(order by slug),true
from _b2b_taxonomy_seed
on conflict(slug) do update set name=excluded.name,description=excluded.description,ai_detection_hints=excluded.ai_detection_hints,is_active=true,updated_at=now();

update public.supplier_categories sc
set name=t.name,description=t.description,category_group=t.category_group,is_active=true,updated_at=now()
from _b2b_taxonomy_seed t where sc.slug=t.slug;

update public.supplier_categories sc
set source_trade_category_id=tc.id,updated_at=now()
from public.trade_categories tc
where sc.slug=tc.slug
  and (sc.source_trade_category_id is null or sc.source_trade_category_id=tc.id)
  and not exists(select 1 from public.supplier_categories other where other.source_trade_category_id=tc.id and other.id<>sc.id);

insert into public.supplier_categories(slug,name,description,source_trade_category_id,category_group,is_active)
select t.slug,t.name,t.description,tc.id,t.category_group,true
from _b2b_taxonomy_seed t join public.trade_categories tc on tc.slug=t.slug
where not exists(select 1 from public.supplier_categories sc where sc.slug=t.slug)
on conflict(slug) do update set name=excluded.name,description=excluded.description,source_trade_category_id=excluded.source_trade_category_id,category_group=excluded.category_group,is_active=true,updated_at=now();
