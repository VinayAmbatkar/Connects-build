/**
 * Category tree from "Category Requirements Latest.xlsx"
 * Ported from D:\frontend_code\src\app\core\constants\category.constants.ts
 *
 * Discipline (Sub1) → Specialization (Sub2) is client-side — the options API
 * does not link specializations to disciplines.
 */

export type CategoryOption = {
  id: string;
  label: string;
};

export const PROJECT_TYPE_OPTIONS: CategoryOption[] = [
  { id: 'LOW_RISE_RESIDENTIAL', label: 'Low Rise Residential' },
  { id: 'HIGH_RISE_RESIDENTIAL', label: 'High Rise Residential' },
  { id: 'COMMERCIAL', label: 'Commercial' },
  { id: 'HEALTHCARE', label: 'Healthcare' },
  { id: 'HOSPITALITY', label: 'Hospitality' },
  { id: 'INDUSTRIAL', label: 'Industrial' },
  { id: 'INFRASTRUCTURE', label: 'Infrastructure' },
  { id: 'INSTITUTIONAL', label: 'Institutional' },
  { id: 'CULTURAL', label: 'Cultural' },
  { id: 'WAREHOUSING', label: 'Warehousing' },
  { id: 'MIXED_USE', label: 'Mixed-Use' },
  { id: 'RECREATIONAL', label: 'Recreational' },
  { id: 'IT_CENTRES', label: 'IT Centres' },
];

export const DISCIPLINES_BY_ROLE: Record<string, CategoryOption[]> = {
  CONSULTANTS: [
    { id: 'DESIGNERS', label: 'Designers' },
    { id: 'ENGINEERS', label: 'Engineers' },
    { id: 'PMC', label: 'PMC' },
    { id: 'DIGITAL', label: 'Digital' },
  ],
  BUILDERS: [
    { id: 'BUILDINGS', label: 'Buildings' },
    { id: 'INFRASTRUCTURE', label: 'Infrastructure' },
  ],
  CONTRACTORS: [
    { id: 'CORE_CONTRACTORS', label: 'Core' },
    { id: 'CIVIL_STRUCTURAL_CONTRACTORS', label: 'Civil & Structural' },
    { id: 'BUILDING_ENVELOPE_CONTRACTORS', label: 'Building Envelope' },
    { id: 'MEP_CONTRACTORS', label: 'MEP' },
    { id: 'VERTICAL_TRANSPORTATION', label: 'Vertical Transportation' },
    { id: 'INTERIOR_FINISHING_CONTRACTORS', label: 'Interior & Finishing' },
    { id: 'EXTERNAL_WORKS_CONTRACTORS', label: 'External Works' },
    { id: 'SPECIALIZED_CONTRACTORS', label: 'Specialized' },
  ],
  VENDORS: [
    { id: 'STRUCTURAL_CIVIL_VENDORS', label: 'Structural & Civil' },
    { id: 'ARCHITECTURAL_VENDORS', label: 'Architectural' },
    { id: 'MEP_VENDORS', label: 'MEP' },
    { id: 'FIRE_SAFETY_VENDORS', label: 'Fire & Safety' },
    { id: 'ELV_ICT_VENDORS', label: 'ELV & ICT' },
    { id: 'VERTICAL_TRANSPORTATION_VENDORS', label: 'Vertical Transportation' },
    { id: 'EXTERNAL_WORKS_VENDORS', label: 'External Works' },
    { id: 'SPECIALIZED_VENDORS', label: 'Specialized Systems' },
    { id: 'CONSTRUCTION_EQUIPMENT_VENDORS', label: 'Construction Equipment' },
  ],
  OTHERS: [{ id: 'USER_DEFINED', label: 'Users Can Define' }],
};

/** Discipline → specializations (Sub2 by Sub1). Builders intentionally have no entries. */
export const SPECIALIZATIONS_BY_DISCIPLINE: Record<string, CategoryOption[]> = {
  DESIGNERS: [
    { id: 'ARCHITECT', label: 'Architect' },
    { id: 'ENVIRONMENTAL', label: 'Environmental' },
    { id: 'URBAN_PLANNER', label: 'Urban Planner' },
    { id: 'TOWN_PLANNER', label: 'Town Planner' },
    { id: 'LANDSCAPE', label: 'Landscape' },
    { id: 'INTERIOR', label: 'Interior' },
    { id: 'CONSERVATION', label: 'Conservation' },
    { id: 'LIGHTING', label: 'Lighting' },
    { id: 'FACADE', label: 'Façade' },
    { id: 'ENERGY_EFFICIENCY', label: 'Energy Efficiency' },
  ],
  ENGINEERS: [
    { id: 'STRUCTURAL', label: 'Structural' },
    { id: 'MEP', label: 'MEP' },
    { id: 'FIRE_SAFETY', label: 'Fire Safety' },
    { id: 'WASTE_MANAGEMENT', label: 'Waste Management' },
    { id: 'BIM', label: 'BIM' },
    { id: 'THREE_D_PRINTING', label: '3D Printing' },
    { id: 'WIND', label: 'Wind' },
    { id: 'HELIPAD', label: 'Helipad' },
    { id: 'BRIDGES', label: 'Bridges' },
    { id: 'SIGNAGE', label: 'Signage' },
    { id: 'PARKING', label: 'Parking' },
    { id: 'TRAFFIC', label: 'Traffic' },
    { id: 'TRANSPORT', label: 'Transport' },
    { id: 'STP', label: 'STP' },
    { id: 'WTP', label: 'WTP' },
    { id: 'HVAC', label: 'HVAC' },
    { id: 'ACOUSTICS', label: 'Acoustics' },
    { id: 'VERTICAL_TRANSPORTATION', label: 'Vertical Transportation' },
  ],
  PMC: [
    { id: 'PROJECT_MANAGEMENT', label: 'Project Management' },
    { id: 'COST_ESTIMATION', label: 'Cost Estimation' },
    { id: 'ARBITRATION', label: 'Arbitration' },
  ],
  DIGITAL: [
    { id: 'BIM', label: 'BIM' },
    { id: 'VDC', label: 'VDC' },
    { id: 'GIS', label: 'GIS' },
    { id: 'GEOSPATIAL', label: 'Geospatial' },
    { id: 'CFD', label: 'CFD' },
    { id: 'DIGITAL_MANUFACTURING', label: 'Digital Manufacturing' },
    { id: 'FEA', label: 'FEA' },
    { id: 'ENERGY_MODELLING', label: 'Energy Modelling' },
    { id: 'BUILDING_PERFORMANCE', label: 'Building Performance' },
    { id: 'AUTOMATION', label: 'Automation' },
  ],
  CORE_CONTRACTORS: [
    { id: 'GENERAL', label: 'General' },
    { id: 'EPC', label: 'EPC' },
  ],
  CIVIL_STRUCTURAL_CONTRACTORS: [
    { id: 'EXCAVATION', label: 'Excavation' },
    { id: 'SHORING', label: 'Shoring' },
    { id: 'DEWATERING', label: 'Dewatering' },
    { id: 'FOUNDATION', label: 'Foundation' },
    { id: 'PILING', label: 'Piling' },
    { id: 'DIAPHRAGM_WALL', label: 'Diaphragm Wall' },
    { id: 'CONCRETE', label: 'Concrete' },
    { id: 'STRUCTURAL_STEEL', label: 'Structural Steel' },
    { id: 'PRECAST_CONCRETE', label: 'Precast Concrete' },
    { id: 'POST_TENSIONING', label: 'Post-Tensioning' },
  ],
  BUILDING_ENVELOPE_CONTRACTORS: [
    { id: 'FACADE', label: 'Facade' },
    { id: 'CURTAIN_WALL', label: 'Curtain Wall' },
    { id: 'GLAZING', label: 'Glazing' },
    { id: 'CLADDING', label: 'Cladding' },
    { id: 'ROOFING', label: 'Roofing' },
    { id: 'WATERPROOFING', label: 'Waterproofing' },
  ],
  MEP_CONTRACTORS: [
    { id: 'MECHANICAL', label: 'Mechanical' },
    { id: 'HVAC', label: 'HVAC' },
    { id: 'ELECTRICAL', label: 'Electrical' },
    { id: 'PLUMBING', label: 'Plumbing' },
    { id: 'FIRE_PROTECTION', label: 'Fire Protection' },
    { id: 'FIRE_ALARM', label: 'Fire Alarm' },
    { id: 'ELV', label: 'ELV' },
    { id: 'ICT', label: 'ICT' },
    { id: 'BMS', label: 'BMS' },
    { id: 'FRESH_AIR', label: 'Fresh Air' },
  ],
  VERTICAL_TRANSPORTATION: [
    { id: 'ELEVATOR', label: 'Elevator' },
    { id: 'ESCALATOR', label: 'Escalator' },
    { id: 'ACCESS_CONTROL_SYSTEMS', label: 'Access Control Systems' },
  ],
  INTERIOR_FINISHING_CONTRACTORS: [
    { id: 'INTERIOR_FIT_OUT', label: 'Interior Fit-Out' },
    { id: 'DRYWALL', label: 'Drywall' },
    { id: 'CEILING', label: 'Ceiling' },
    { id: 'FLOORING', label: 'Flooring' },
    { id: 'PAINTING', label: 'Painting' },
    { id: 'JOINERY', label: 'Joinery' },
    { id: 'CARPENTRY', label: 'Carpentry' },
    { id: 'FURNITURE', label: 'Furniture' },
  ],
  EXTERNAL_WORKS_CONTRACTORS: [
    { id: 'LANDSCAPING', label: 'Landscaping' },
    { id: 'HARDSCAPE', label: 'Hardscape' },
    { id: 'ROAD_AND_PAVEMENT', label: 'Road & Pavement' },
    { id: 'UTILITY', label: 'Utility' },
    { id: 'DRAINAGE', label: 'Drainage' },
  ],
  SPECIALIZED_CONTRACTORS: [
    { id: 'SURVEYING', label: 'Surveying' },
    { id: 'BIM', label: 'BIM' },
    { id: 'TESTING_AND_COMMISSIONING', label: 'Testing & Commissioning' },
    { id: 'FACADE_ACCESS_SYSTEM', label: 'Façade Access System (BMU)' },
    { id: 'SOLAR_SYSTEMS', label: 'Solar Systems' },
    { id: 'SECURITY_SYSTEMS', label: 'Security Systems' },
    { id: 'SMART_HOME_SYSTEMS', label: 'Smart Home Systems' },
    { id: 'O_AND_M', label: 'O&M' },
    { id: 'FACILITIES', label: 'Facilities' },
  ],
  STRUCTURAL_CIVIL_VENDORS: [
    { id: 'CEMENT', label: 'Cement' },
    { id: 'RMC', label: 'RMC' },
    { id: 'REINFORCEMENT_STEEL', label: 'Reinforcement Steel' },
    { id: 'STRUCTURAL_STEEL', label: 'Structural Steel' },
    { id: 'PRECAST_CONCRETE', label: 'Precast Concrete' },
    { id: 'MASONRY_BLOCK', label: 'Masonry Block' },
    { id: 'AGGREGATE', label: 'Aggregate' },
    { id: 'CONCRETE', label: 'Concrete' },
    { id: 'SAND', label: 'Sand' },
    { id: 'WATERPROOFING', label: 'Waterproofing' },
    { id: 'CHEMICALS', label: 'Chemicals' },
  ],
  ARCHITECTURAL_VENDORS: [
    { id: 'DOORS', label: 'Doors' },
    { id: 'WINDOWS', label: 'Windows' },
    { id: 'CURTAIN_WALL', label: 'Curtain Wall' },
    { id: 'GLASS', label: 'Glass' },
    { id: 'CLADDING', label: 'Cladding' },
    { id: 'ROOFING', label: 'Roofing' },
    { id: 'FLOORING', label: 'Flooring' },
    { id: 'CEILING', label: 'Ceiling' },
    { id: 'PAINT', label: 'Paint' },
    { id: 'JOINERY', label: 'Joinery' },
    { id: 'FURNITURE', label: 'Furniture' },
  ],
  MEP_VENDORS: [
    { id: 'CHILLER', label: 'Chiller' },
    { id: 'COOLING_TOWER', label: 'Cooling Tower' },
    { id: 'AIR_HANDLING_UNIT', label: 'Air Handling Unit' },
    { id: 'VENTILATION', label: 'Ventilation' },
    { id: 'ELECTRICAL', label: 'Electrical' },
    { id: 'TRANSFORMER', label: 'Transformer' },
    { id: 'GENERATOR', label: 'Generator' },
    { id: 'UPS', label: 'UPS' },
    { id: 'LIGHTING', label: 'Lighting' },
    { id: 'CABLE', label: 'Cable' },
    { id: 'SWITCHGEAR', label: 'Switchgear' },
    { id: 'PLUMBING', label: 'Plumbing' },
    { id: 'PUMPS', label: 'Pumps' },
    { id: 'VALVES', label: 'Valves' },
    { id: 'STP', label: 'STP' },
    { id: 'WTP', label: 'WTP' },
  ],
  FIRE_SAFETY_VENDORS: [
    { id: 'FIRE_ALARM', label: 'Fire Alarm' },
    { id: 'FIRE_PROTECTION', label: 'Fire Protection' },
    { id: 'FIRE_FIGHTING_EQUIPMENT', label: 'Fire Fighting Equipment' },
    { id: 'SPRINKLER_SYSTEMS', label: 'Sprinkler Systems' },
    { id: 'FIRE_DOORS', label: 'Fire Doors' },
    { id: 'EMERGENCY_LIGHTING', label: 'Emergency Lighting' },
  ],
  ELV_ICT_VENDORS: [
    { id: 'CCTV', label: 'CCTV' },
    { id: 'ACCESS_CONTROL', label: 'Access Control' },
    { id: 'STRUCTURED_CABLING', label: 'Structured Cabling' },
    { id: 'NETWORK_EQUIPMENT', label: 'Network Equipment' },
    { id: 'WIFI_SYSTEMS', label: 'Wi-Fi Systems' },
    { id: 'INTERCOM', label: 'Intercom' },
    { id: 'PUBLIC_ADDRESS', label: 'Public Address' },
    { id: 'AUDIO_VISUAL', label: 'Audio Visual' },
    { id: 'BMS_EQUIPMENT', label: 'BMS Equipment' },
    { id: 'SMART_HOME_SYSTEMS', label: 'Smart Home Systems' },
  ],
  VERTICAL_TRANSPORTATION_VENDORS: [
    { id: 'ELEVATOR', label: 'Elevator' },
    { id: 'ESCALATOR', label: 'Escalator' },
    { id: 'BMS_UNITS', label: 'BMS Units' },
  ],
  EXTERNAL_WORKS_VENDORS: [
    { id: 'LANDSCAPING', label: 'Landscaping' },
    { id: 'IRRIGATION_SYSTEMS', label: 'Irrigation Systems' },
    { id: 'STREET_LIGHTING', label: 'Street Lighting' },
    { id: 'LIGHTING', label: 'Lighting' },
    { id: 'PAVING_MATERIALS', label: 'Paving Materials' },
    { id: 'OUTDOOR_FURNITURE', label: 'Outdoor Furniture' },
  ],
  SPECIALIZED_VENDORS: [
    { id: 'SOLAR', label: 'Solar' },
    { id: 'BATTERY_STORAGE', label: 'Battery Storage' },
    { id: 'FACADE_ACCESS_SYSTEMS', label: 'Facade Access Systems' },
    { id: 'SECURITY_SYSTEMS', label: 'Security Systems' },
    { id: 'PARKING_MANAGEMENT', label: 'Parking Management' },
    { id: 'WASTE_MANAGEMENT', label: 'Waste Management' },
    { id: 'EV_CHARGING', label: 'EV Charging' },
  ],
  CONSTRUCTION_EQUIPMENT_VENDORS: [
    { id: 'TOWER_CRANE', label: 'Tower Crane' },
    { id: 'PASSENGER_HOIST', label: 'Passenger Hoist' },
    { id: 'CONCRETE_PUMP', label: 'Concrete Pump' },
    { id: 'FORMWORK', label: 'Formwork' },
    { id: 'SCAFFOLDING', label: 'Scaffolding' },
    { id: 'EXCAVATOR', label: 'Excavator' },
    { id: 'BACKHOE_LOADER', label: 'Backhoe Loader' },
    { id: 'BULLDOZER', label: 'Bulldozer' },
    { id: 'TRENCHER', label: 'Trencher' },
    { id: 'SCRAPER', label: 'Scraper' },
    { id: 'BOOM_LIFT', label: 'Boom Lift' },
    { id: 'FORKLIFT', label: 'Forklift' },
    { id: 'SCISSOR_LIFT', label: 'Scissor Lift' },
    { id: 'HOIST', label: 'Hoist' },
    { id: 'DUMP_TRUCK', label: 'Dump Truck' },
  ],
};

export function getSpecializationsForDiscipline(disciplineId: string): CategoryOption[] {
  const key = Object.keys(SPECIALIZATIONS_BY_DISCIPLINE).find(
    (k) => k.toLowerCase().replace(/_/g, '-') === disciplineId.trim().toLowerCase().replace(/_/g, '-'),
  );
  if (!key) return [];
  return SPECIALIZATIONS_BY_DISCIPLINE[key] ?? [];
}

export function getDisciplinesForRole(roleId?: string): CategoryOption[] {
  if (!roleId?.trim()) return [];
  const key = Object.keys(DISCIPLINES_BY_ROLE).find(
    (k) => k.toLowerCase() === roleId.trim().toLowerCase(),
  );
  if (!key) return [];
  return DISCIPLINES_BY_ROLE[key] ?? [];
}

/** City / metro codes used by guided search + profiles. */
export const LOCATION_OPTIONS: CategoryOption[] = [
  { id: 'MUMBAI', label: 'Mumbai' },
  { id: 'DELHI_NCR', label: 'Delhi NCR' },
  { id: 'BENGALURU', label: 'Bengaluru' },
  { id: 'HYDERABAD', label: 'Hyderabad' },
  { id: 'CHENNAI', label: 'Chennai' },
  { id: 'PUNE', label: 'Pune' },
  { id: 'KOLKATA', label: 'Kolkata' },
  { id: 'AHMEDABAD', label: 'Ahmedabad' },
  { id: 'JAIPUR', label: 'Jaipur' },
  { id: 'AMARAVATI', label: 'Amaravati' },
  { id: 'ITANAGAR', label: 'Itanagar' },
  { id: 'GUWAHATI', label: 'Guwahati' },
  { id: 'PATNA', label: 'Patna' },
  { id: 'RAIPUR', label: 'Raipur' },
  { id: 'PANAJI', label: 'Panaji' },
  { id: 'GANDHINAGAR', label: 'Gandhinagar' },
  { id: 'CHANDIGARH', label: 'Chandigarh' },
  { id: 'SHIMLA', label: 'Shimla' },
  { id: 'RANCHI', label: 'Ranchi' },
  { id: 'THIRUVANANTHAPURAM', label: 'Thiruvananthapuram' },
  { id: 'BHOPAL', label: 'Bhopal' },
  { id: 'IMPHAL', label: 'Imphal' },
  { id: 'SHILLONG', label: 'Shillong' },
  { id: 'AIZAWL', label: 'Aizawl' },
  { id: 'KOHIMA', label: 'Kohima' },
  { id: 'BHUBANESWAR', label: 'Bhubaneswar' },
  { id: 'GANGTOK', label: 'Gangtok' },
  { id: 'AGARTALA', label: 'Agartala' },
  { id: 'LUCKNOW', label: 'Lucknow' },
  { id: 'DEHRADUN', label: 'Dehradun' },
  { id: 'SRINAGAR', label: 'Srinagar' },
  { id: 'LEH', label: 'Leh' },
  { id: 'PUDUCHERRY', label: 'Puducherry' },
  { id: 'NAGPUR', label: 'Nagpur' },
  { id: 'NASHIK', label: 'Nashik' },
  { id: 'SURAT', label: 'Surat' },
  { id: 'VADODARA', label: 'Vadodara' },
  { id: 'RAJKOT', label: 'Rajkot' },
  { id: 'VISAKHAPATNAM', label: 'Visakhapatnam' },
  { id: 'VIJAYAWADA', label: 'Vijayawada' },
  { id: 'COIMBATORE', label: 'Coimbatore' },
  { id: 'MADURAI', label: 'Madurai' },
  { id: 'TIRUCHIRAPPALLI', label: 'Tiruchirappalli' },
  { id: 'MYSURU', label: 'Mysuru' },
  { id: 'MANGALURU', label: 'Mangaluru' },
  { id: 'KOCHI', label: 'Kochi' },
  { id: 'KOZHIKODE', label: 'Kozhikode' },
  { id: 'KANPUR', label: 'Kanpur' },
  { id: 'NOIDA', label: 'Noida' },
  { id: 'GHAZIABAD', label: 'Ghaziabad' },
  { id: 'VARANASI', label: 'Varanasi' },
  { id: 'AGRA', label: 'Agra' },
  { id: 'LUDHIANA', label: 'Ludhiana' },
  { id: 'AMRITSAR', label: 'Amritsar' },
  { id: 'GURUGRAM', label: 'Gurugram' },
  { id: 'FARIDABAD', label: 'Faridabad' },
  { id: 'INDORE', label: 'Indore' },
  { id: 'GWALIOR', label: 'Gwalior' },
  { id: 'JABALPUR', label: 'Jabalpur' },
  { id: 'JODHPUR', label: 'Jodhpur' },
  { id: 'UDAIPUR', label: 'Udaipur' },
  { id: 'KOTA', label: 'Kota' },
  { id: 'SILIGURI', label: 'Siliguri' },
  { id: 'CUTTACK', label: 'Cuttack' },
  { id: 'JAMSHEDPUR', label: 'Jamshedpur' },
  { id: 'DHANBAD', label: 'Dhanbad' },
];

export const LOCATION_LABELS: Record<string, string> = Object.fromEntries(
  LOCATION_OPTIONS.map((opt) => [opt.id, opt.label]),
);

export function getLocationLabel(id?: string | null) {
  if (!id?.trim()) return '';
  return LOCATION_LABELS[id] ?? id;
}

/** Map home/find-connections role tiles → category API role keys. */
export const HOME_ROLE_TO_CATEGORY_ROLE: Record<string, string> = {
  CONSULTANT: 'CONSULTANTS',
  CONTRACTOR: 'CONTRACTORS',
  BUILDER: 'BUILDERS',
  VENDOR: 'VENDORS',
  Consultant: 'CONSULTANTS',
  Contractor: 'CONTRACTORS',
  Builder: 'BUILDERS',
  Vendor: 'VENDORS',
  Architect: 'CONSULTANTS',
  Engineer: 'CONSULTANTS',
};

export const CATEGORY_ROLE_LABELS: Record<string, string> = {
  CONSULTANTS: 'Consultants',
  CONTRACTORS: 'Contractors',
  BUILDERS: 'Builders',
  VENDORS: 'Vendors',
  OTHERS: 'Others',
};

export function getCategoryRoleLabel(roleId?: string | null) {
  if (!roleId) return '';
  return CATEGORY_ROLE_LABELS[roleId] ?? roleId;
}

export function getOptionLabel(
  options: CategoryOption[],
  id?: string | null,
): string {
  if (!id) return '';
  return options.find((o) => o.id === id)?.label ?? id;
}
