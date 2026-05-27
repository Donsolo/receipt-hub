export interface TradePreset {
    tradeMode: string;
    label: string;
    commonUnits: string[];
    inspectionFocus: string;
    followUpQuestions: string[];
    suggestedStructure: string;
    pricingSafetyNote: string;
    measurementWarning: string;
}

export const TRADE_PRESETS: Record<string, TradePreset> = {
    // Legacy mapping support
    general: {
        tradeMode: 'general',
        label: 'General Contracting',
        commonUnits: ['each', 'hour'],
        inspectionFocus: 'Identify visible objects, materials, damage, and general work scope.',
        followUpQuestions: ['Are there any hidden damages not visible in the photo?'],
        suggestedStructure: 'Standard line items with generic titles.',
        pricingSafetyNote: 'Provide broad generic price ranges.',
        measurementWarning: 'Do not invent measurements without clear scale.'
    },
    general_contracting: {
        tradeMode: 'general_contracting',
        label: 'General Contracting',
        commonUnits: ['each', 'hour'],
        inspectionFocus: 'Identify visible objects, materials, damage, and general work scope.',
        followUpQuestions: ['Are there any hidden damages not visible in the photo?'],
        suggestedStructure: 'Standard line items with generic titles.',
        pricingSafetyNote: 'Provide broad generic price ranges.',
        measurementWarning: 'Do not invent measurements without clear scale.'
    },
    roofing: {
        tradeMode: 'roofing',
        label: 'Roofing',
        commonUnits: ['square', 'sq ft'],
        inspectionFocus: 'Pay special attention to roof pitch, shingle type, square footage estimates, and potential water damage.',
        followUpQuestions: ['How old is the current roof?', 'Are there active interior leaks?'],
        suggestedStructure: 'Tear off, underlayment, shingles, flashing, ridge cap.',
        pricingSafetyNote: 'Roofing estimates must include a wide variance for hidden decking damage.',
        measurementWarning: 'Roof pitch and exact square footage cannot be accurately measured from the ground.'
    },
    plumbing: {
        tradeMode: 'plumbing',
        label: 'Plumbing',
        commonUnits: ['each', 'hour'],
        inspectionFocus: 'Look for visible pipe materials, leak indicators, fixture types, and water damage.',
        followUpQuestions: ['Is the water currently shut off?', 'Is the leak active?'],
        suggestedStructure: 'Diagnostic fee, fixture replacement, pipe repair, leak detection.',
        pricingSafetyNote: 'Plumbing prices should note that hidden wall/floor damage may significantly alter the final cost.',
        measurementWarning: 'Only exposed plumbing can be evaluated.'
    },
    electrical: {
        tradeMode: 'electrical',
        label: 'Electrical',
        commonUnits: ['each', 'hour'],
        inspectionFocus: 'Identify panel types, visible wiring, fixture mounts, and electrical hazards.',
        followUpQuestions: ['Is the power currently turned off to this area?'],
        suggestedStructure: 'Diagnostic fee, fixture installation, wiring run, panel upgrade.',
        pricingSafetyNote: 'Include disclaimers for bringing older wiring up to code.',
        measurementWarning: 'Wire gauge and internal box volume cannot be seen in closed walls.'
    },
    hvac: {
        tradeMode: 'hvac',
        label: 'HVAC',
        commonUnits: ['each', 'hour'],
        inspectionFocus: 'Identify unit types (furnace, AC, heat pump), visible ductwork, and thermostat systems.',
        followUpQuestions: ['Is the unit currently receiving power?', 'When was the last filter change?'],
        suggestedStructure: 'Diagnostic fee, part replacement, freon recharge, new unit installation.',
        pricingSafetyNote: 'Internal mechanical failures require hands-on testing.',
        measurementWarning: 'Tonnage and exact unit specifications must be verified on site.'
    },
    lawncare: {
        tradeMode: 'lawncare',
        label: 'Lawn Care',
        commonUnits: ['sq ft', 'acre', 'visit'],
        inspectionFocus: 'Estimate grass height, yard square footage, landscaping obstacles, and overgrowth.',
        followUpQuestions: ['What is the total square footage of the lot?'],
        suggestedStructure: 'Mowing, edging, trimming, and debris removal.',
        pricingSafetyNote: 'Provide price ranges based on standard residential lot sizes.',
        measurementWarning: 'Grass height and lot size are estimates and must be verified on site.'
    },
    landscaping: {
        tradeMode: 'landscaping',
        label: 'Landscaping',
        commonUnits: ['sq ft', 'yard', 'hour'],
        inspectionFocus: 'Evaluate terrain, existing plant life, hardscape potential, and soil conditions.',
        followUpQuestions: ['Are there any underground utilities marked?'],
        suggestedStructure: 'Design fee, materials (mulch/soil/plants), labor, hardscape installation.',
        pricingSafetyNote: 'Material costs fluctuate; note that estimates are subject to supplier pricing.',
        measurementWarning: 'Slope grades and exact yard dimensions require on-site measurement.'
    },
    tree_services: {
        tradeMode: 'tree_services',
        label: 'Tree Services',
        commonUnits: ['each', 'hour', 'day'],
        inspectionFocus: 'Identify tree height, proximity to structures/power lines, and signs of disease or decay.',
        followUpQuestions: ['Are there power lines running through or near the branches?'],
        suggestedStructure: 'Tree removal, stump grinding, pruning, debris haul-away.',
        pricingSafetyNote: 'Hazardous removals near structures should include premium risk pricing.',
        measurementWarning: 'Tree height and exact canopy width are estimates from photos.'
    },
    snow_removal: {
        tradeMode: 'snow_removal',
        label: 'Snow Removal',
        commonUnits: ['sq ft', 'visit', 'inch'],
        inspectionFocus: 'Evaluate driveway/parking lot size, sidewalk length, and obstacles.',
        followUpQuestions: ['What is the expected snow accumulation?'],
        suggestedStructure: 'Plowing, shoveling, salting/de-icing.',
        pricingSafetyNote: 'Base price on standard accumulation; include surcharges for heavy storms.',
        measurementWarning: 'Exact square footage must be verified for commercial lots.'
    },
    pressure_washing: {
        tradeMode: 'pressure_washing',
        label: 'Pressure Washing',
        commonUnits: ['sq ft', 'hour'],
        inspectionFocus: 'Identify surface materials, staining, mold, and total area.',
        followUpQuestions: ['Is there an accessible water source on site?'],
        suggestedStructure: 'Surface cleaning, soft washing, chemical treatment.',
        pricingSafetyNote: 'Provide per-sq-ft range or standard flat rates for driveways/houses.',
        measurementWarning: 'Square footage from photos is highly subjective.'
    },
    painting: {
        tradeMode: 'painting',
        label: 'Painting',
        commonUnits: ['sq ft', 'room', 'hour'],
        inspectionFocus: 'Identify wall condition, current colors, trim details, and ceiling height.',
        followUpQuestions: ['Are we painting the ceilings and trim as well?'],
        suggestedStructure: 'Prep work (patch/sand), primer, paint coats, trim work.',
        pricingSafetyNote: 'Note that heavily damaged walls require additional prep labor.',
        measurementWarning: 'Exact square footage and ceiling height must be verified.'
    },
    flooring: {
        tradeMode: 'flooring',
        label: 'Flooring',
        commonUnits: ['sq ft', 'hour'],
        inspectionFocus: 'Identify current flooring type, subfloor condition if visible, and room transitions.',
        followUpQuestions: ['Will we need to remove and dispose of the existing flooring?'],
        suggestedStructure: 'Tear out, subfloor prep, installation, transitions/baseboards.',
        pricingSafetyNote: 'Include disclaimers for uneven subfloors found after tear-out.',
        measurementWarning: 'Square footage and waste factor calculations require on-site measurement.'
    },
    drywall: {
        tradeMode: 'drywall',
        label: 'Drywall',
        commonUnits: ['sheet', 'sq ft', 'hour'],
        inspectionFocus: 'Identify hole sizes, water damage, texture matching requirements, and ceiling work.',
        followUpQuestions: ['Is there insulation replacement needed behind the drywall?'],
        suggestedStructure: 'Hanging, taping, mudding, texture matching, painting.',
        pricingSafetyNote: 'Texture matching is an art and may require premium pricing for seamless blending.',
        measurementWarning: 'Exact sheet count depends on room layout and waste.'
    },
    concrete: {
        tradeMode: 'concrete',
        label: 'Concrete',
        commonUnits: ['sq ft', 'cubic yard'],
        inspectionFocus: 'Identify slab size, cracking, spalling, grading, and accessibility for trucks.',
        followUpQuestions: ['Can a concrete truck easily access the pour site?'],
        suggestedStructure: 'Excavation, forming, pouring, finishing, sealing.',
        pricingSafetyNote: 'Include clauses for unpredictable soil/grading conditions.',
        measurementWarning: 'Cubic yardage requires precise depth measurements.'
    },
    remodeling: {
        tradeMode: 'remodeling',
        label: 'Remodeling',
        commonUnits: ['sq ft', 'project'],
        inspectionFocus: 'Evaluate overall room layout, load-bearing walls, plumbing/electrical moves.',
        followUpQuestions: ['Are we changing the footprint or moving plumbing/electrical?'],
        suggestedStructure: 'Demolition, framing, rough-in, drywall, finishes.',
        pricingSafetyNote: 'Provide very broad ranges; remodeling inherently has hidden costs.',
        measurementWarning: 'Measurements are strictly for preliminary estimates.'
    },
    fence_installation: {
        tradeMode: 'fence_installation',
        label: 'Fence Installation',
        commonUnits: ['linear ft', 'post'],
        inspectionFocus: 'Identify terrain slope, soil type, existing fence removal, and gate locations.',
        followUpQuestions: ['Are there any underground utilities or sprinkler lines marked?'],
        suggestedStructure: 'Tear down, post setting, panel/picket installation, gates.',
        pricingSafetyNote: 'Rock digging or root removal may incur extra charges.',
        measurementWarning: 'Linear footage must be measured accurately on site.'
    },
    pool_services: {
        tradeMode: 'pool_services',
        label: 'Pool Services',
        commonUnits: ['visit', 'month', 'hour'],
        inspectionFocus: 'Identify pool size, water condition (algae), pump/filter visible issues.',
        followUpQuestions: ['When was the pool last professionally serviced?'],
        suggestedStructure: 'Chemical balancing, vacuuming, filter cleaning, equipment repair.',
        pricingSafetyNote: 'Green pool recoveries often require multiple visits and heavy chemicals.',
        measurementWarning: 'Gallon capacity and chemical needs are estimated.'
    },
    cleaning_services: {
        tradeMode: 'cleaning_services',
        label: 'Cleaning Services',
        commonUnits: ['sq ft', 'room', 'hour'],
        inspectionFocus: 'Estimate clutter levels, surface dirt, floor types, and overall room size.',
        followUpQuestions: ['Do you have pets?', 'When was the last deep clean?'],
        suggestedStructure: 'Standard clean, deep clean, move-in/out clean.',
        pricingSafetyNote: 'Pricing should assume standard maintenance cleaning unless heavy soiling is visible.',
        measurementWarning: 'Hidden areas and inside appliances are excluded unless requested.'
    },
    cleaning: {
        tradeMode: 'cleaning',
        label: 'Cleaning Services',
        commonUnits: ['sq ft', 'room', 'hour'],
        inspectionFocus: 'Estimate clutter levels, surface dirt, floor types, and overall room size.',
        followUpQuestions: ['Do you have pets?', 'When was the last deep clean?'],
        suggestedStructure: 'Standard clean, deep clean, move-in/out clean.',
        pricingSafetyNote: 'Pricing should assume standard maintenance cleaning unless heavy soiling is visible.',
        measurementWarning: 'Hidden areas and inside appliances are excluded unless requested.'
    },
    junk_removal: {
        tradeMode: 'junk_removal',
        label: 'Junk Removal',
        commonUnits: ['load', 'truck', 'item'],
        inspectionFocus: 'Estimate total volume, heavy/hazardous items (appliances, paint), and accessibility.',
        followUpQuestions: ['Are all items located on the ground floor?'],
        suggestedStructure: 'Truck load percentage, heavy item surcharge, disposal fees.',
        pricingSafetyNote: 'Hazardous materials or extremely heavy items (pianos, safes) carry premiums.',
        measurementWarning: 'Volume is estimated; final price depends on actual truck space used.'
    },
    pest_control: {
        tradeMode: 'pest_control',
        label: 'Pest Control',
        commonUnits: ['sq ft', 'visit'],
        inspectionFocus: 'Identify visible signs of infestation, entry points, and property size.',
        followUpQuestions: ['Are there pets or children currently in the home?'],
        suggestedStructure: 'Initial inspection, treatment application, exclusion work, follow-up.',
        pricingSafetyNote: 'Severe infestations may require multiple treatments not quoted initially.',
        measurementWarning: 'Extent of infestation inside walls cannot be seen.'
    },
    window_tinting: {
        tradeMode: 'window_tinting',
        label: 'Window Tinting',
        commonUnits: ['sq ft', 'window', 'vehicle'],
        inspectionFocus: 'Identify window sizes, shapes, accessibility, and old tint that needs removal.',
        followUpQuestions: ['Is there existing tint that needs to be removed first?'],
        suggestedStructure: 'Old tint removal, prep/cleaning, film installation.',
        pricingSafetyNote: 'Curved or hard-to-reach windows may have labor upcharges.',
        measurementWarning: 'Exact square footage and curvature must be verified.'
    },
    auto_detailing: {
        tradeMode: 'auto_detailing',
        label: 'Auto Detailing',
        commonUnits: ['vehicle', 'hour'],
        inspectionFocus: 'Pay special attention to vehicle interior/exterior condition, pet hair, stains, and paint condition.',
        followUpQuestions: ['Is there excessive pet hair or mold?', 'What year, make, and model is the vehicle?'],
        suggestedStructure: 'Interior cleaning, exterior wash, paint correction, ceramic coating.',
        pricingSafetyNote: 'Price ranges should account for standard vehicle sizes. Add premiums for heavy soiling.',
        measurementWarning: 'Hidden stains or odors cannot be detected via photo.'
    },
    detailing: {
        tradeMode: 'detailing',
        label: 'Auto Detailing',
        commonUnits: ['vehicle', 'hour'],
        inspectionFocus: 'Pay special attention to vehicle interior/exterior condition, pet hair, stains, and paint condition.',
        followUpQuestions: ['Is there excessive pet hair or mold?', 'What year, make, and model is the vehicle?'],
        suggestedStructure: 'Interior cleaning, exterior wash, paint correction, ceramic coating.',
        pricingSafetyNote: 'Price ranges should account for standard vehicle sizes. Add premiums for heavy soiling.',
        measurementWarning: 'Hidden stains or odors cannot be detected via photo.'
    },
    mobile_mechanic: {
        tradeMode: 'mobile_mechanic',
        label: 'Mobile Mechanic',
        commonUnits: ['hour', 'job'],
        inspectionFocus: 'Identify vehicle make/model, visible leaks, worn parts, or diagnostic codes.',
        followUpQuestions: ['Is the vehicle currently drivable?'],
        suggestedStructure: 'Diagnostic fee, parts, labor, travel fee.',
        pricingSafetyNote: 'Diagnostic fees apply even if the repair is not completed.',
        measurementWarning: 'Internal engine/transmission diagnostics require hands-on tools.'
    },
    towing: {
        tradeMode: 'towing',
        label: 'Towing',
        commonUnits: ['mile', 'hookup'],
        inspectionFocus: 'Identify vehicle condition (wheels intact, stuck in mud), location, and clearance.',
        followUpQuestions: ['Does the vehicle roll, steer, and brake?'],
        suggestedStructure: 'Hookup fee, mileage fee, winching/recovery surcharge.',
        pricingSafetyNote: 'Complex recoveries (e.g., from ditches or parking garages) incur higher fees.',
        measurementWarning: 'Distance and exact recovery difficulty must be verified.'
    },
    marine_detailing: {
        tradeMode: 'marine_detailing',
        label: 'Marine Detailing',
        commonUnits: ['ft', 'hour'],
        inspectionFocus: 'Identify boat length, hull condition, oxidation, mold, and teak wood.',
        followUpQuestions: ['Is the boat currently in the water or on a trailer?'],
        suggestedStructure: 'Wash, compound/polish, wax/ceramic coating, interior cleaning.',
        pricingSafetyNote: 'Heavy oxidation requires multi-step correction at a premium rate.',
        measurementWarning: 'Exact linear footage and condition are estimates from photos.'
    },
    security_camera_installation: {
        tradeMode: 'security_camera_installation',
        label: 'Security Camera Installation',
        commonUnits: ['camera', 'hour', 'drop'],
        inspectionFocus: 'Identify camera mounting locations, wire routing paths, and network access points.',
        followUpQuestions: ['Is there accessible attic or crawlspace space for wire routing?'],
        suggestedStructure: 'Camera mounting, wire runs, DVR/NVR setup, network configuration.',
        pricingSafetyNote: 'Difficult wire runs (e.g., solid brick walls, no attic) incur additional labor.',
        measurementWarning: 'Wall interiors and exact cable run lengths cannot be fully seen.'
    },
    low_voltage_networking: {
        tradeMode: 'low_voltage_networking',
        label: 'Low Voltage / Networking',
        commonUnits: ['drop', 'hour', 'ft'],
        inspectionFocus: 'Identify wall types, server rack locations, and existing infrastructure.',
        followUpQuestions: ['Do you require Cat6, Cat6a, or fiber?'],
        suggestedStructure: 'Cable drops, wall plates, rack installation, testing/certification.',
        pricingSafetyNote: 'Firewall penetrations or conduit installations may require extra fees.',
        measurementWarning: 'Hidden obstacles in walls may affect wire routing.'
    },
    industrial_maintenance: {
        tradeMode: 'industrial_maintenance',
        label: 'Industrial Maintenance',
        commonUnits: ['hour', 'project'],
        inspectionFocus: 'Identify heavy machinery, safety hazards, structural components, and access points.',
        followUpQuestions: ['Are there specific lockout/tagout safety procedures required?'],
        suggestedStructure: 'Diagnostic/inspection, specialized labor, parts, safety protocol fee.',
        pricingSafetyNote: 'Requires specialized hourly rates; off-hours work carries a premium.',
        measurementWarning: 'Internal machine diagnostics require hands-on inspection.'
    },
    appliance_repair: {
        tradeMode: 'appliance_repair',
        label: 'Appliance Repair',
        commonUnits: ['hour', 'job'],
        inspectionFocus: 'Identify appliance make/model, visible damage, or error codes on displays.',
        followUpQuestions: ['What is the exact model number of the appliance?'],
        suggestedStructure: 'Service call/diagnostic fee, labor, replacement parts.',
        pricingSafetyNote: 'Diagnostic fees are usually required regardless of repair status.',
        measurementWarning: 'Internal component failure cannot be determined from photos.'
    },
    welding: {
        tradeMode: 'welding',
        label: 'Welding',
        commonUnits: ['hour', 'inch'],
        inspectionFocus: 'Identify metal types (steel, aluminum), thickness, joint types, and accessibility.',
        followUpQuestions: ['Is this a structural load-bearing weld?'],
        suggestedStructure: 'Prep/grinding, welding labor, materials, travel fee (if mobile).',
        pricingSafetyNote: 'Specialty metals or confined space welding carry premium rates.',
        measurementWarning: 'Metal thickness and exact alloy type must be verified.'
    },
    moving_services: {
        tradeMode: 'moving_services',
        label: 'Moving Services',
        commonUnits: ['hour', 'truck', 'item'],
        inspectionFocus: 'Estimate volume of items, heavy furniture, fragility, and stairs.',
        followUpQuestions: ['Are there stairs or elevators involved?', 'Are items already boxed?'],
        suggestedStructure: 'Truck load, hourly labor, heavy item surcharge, packing materials.',
        pricingSafetyNote: 'Ranges should account for loading/unloading time variance.',
        measurementWarning: 'Box weight and hidden closet items cannot be estimated from photos.'
    },
    moving: {
        tradeMode: 'moving',
        label: 'Moving Services',
        commonUnits: ['hour', 'truck', 'item'],
        inspectionFocus: 'Estimate volume of items, heavy furniture, fragility, and stairs.',
        followUpQuestions: ['Are there stairs or elevators involved?', 'Are items already boxed?'],
        suggestedStructure: 'Truck load, hourly labor, heavy item surcharge, packing materials.',
        pricingSafetyNote: 'Ranges should account for loading/unloading time variance.',
        measurementWarning: 'Box weight and hidden closet items cannot be estimated from photos.'
    },
    photography: {
        tradeMode: 'photography',
        label: 'Photography',
        commonUnits: ['hour', 'package', 'photo'],
        inspectionFocus: 'Identify location lighting, subject matter, and environment.',
        followUpQuestions: ['How many final edited photos are you expecting?'],
        suggestedStructure: 'Session fee, editing/retouching labor, digital delivery, prints.',
        pricingSafetyNote: 'Travel fees and extensive retouching should be quoted separately.',
        measurementWarning: 'Lighting conditions may change on the day of the shoot.'
    },
    videography: {
        tradeMode: 'videography',
        label: 'Videography',
        commonUnits: ['hour', 'project'],
        inspectionFocus: 'Identify shooting environment, required angles, and audio constraints.',
        followUpQuestions: ['Do you need drone footage or specialized audio equipment?'],
        suggestedStructure: 'Shooting labor, editing/post-production, licensing, delivery.',
        pricingSafetyNote: 'Post-production often takes 2-3x longer than shooting time.',
        measurementWarning: 'Acoustics and lighting must be tested on site.'
    },
    dj_services: {
        tradeMode: 'dj_services',
        label: 'DJ Services',
        commonUnits: ['hour', 'event'],
        inspectionFocus: 'Identify venue size, acoustic layout, and power outlet availability.',
        followUpQuestions: ['Does the venue provide any sound or lighting equipment?'],
        suggestedStructure: 'Performance time, setup/teardown, lighting package, MC services.',
        pricingSafetyNote: 'Large venues require extra speakers/subs at an additional cost.',
        measurementWarning: 'Power availability must be verified with the venue.'
    },
    event_services: {
        tradeMode: 'event_services',
        label: 'Event Services',
        commonUnits: ['event', 'guest'],
        inspectionFocus: 'Identify venue layout, spatial constraints, and rental equipment needs.',
        followUpQuestions: ['What is the expected guest count?'],
        suggestedStructure: 'Planning/coordination fee, equipment rentals, setup/teardown, staffing.',
        pricingSafetyNote: 'Include buffer budgets for last-minute vendor or rental changes.',
        measurementWarning: 'Exact venue dimensions must be mapped out.'
    },
    beauty: {
        tradeMode: 'beauty',
        label: 'Beauty',
        commonUnits: ['session', 'service'],
        inspectionFocus: 'Identify current hair/skin condition, existing color, length, and texture.',
        followUpQuestions: ['What is your hair coloring history for the past 2 years?'],
        suggestedStructure: 'Consultation, base service, processing, styling.',
        pricingSafetyNote: 'Provide base price with "starting at" ranges depending on product usage.',
        measurementWarning: 'Texture and exact condition require in-person consultation.'
    },
    barber: {
        tradeMode: 'barber',
        label: 'Barber',
        commonUnits: ['service'],
        inspectionFocus: 'Identify current hair length, desired style complexities, and beard growth.',
        followUpQuestions: ['When was your last haircut?'],
        suggestedStructure: 'Haircut, beard trim, straight razor shave, styling.',
        pricingSafetyNote: 'Standard shop rates apply, note any complex styling surcharges.',
        measurementWarning: 'Cowlicks and exact hair density cannot be fully assessed from photos.'
    },
    tattoo_artist: {
        tradeMode: 'tattoo_artist',
        label: 'Tattoo Artist',
        commonUnits: ['hour', 'piece'],
        inspectionFocus: 'Identify placement area on body, skin condition, and cover-up requirements.',
        followUpQuestions: ['Is this a cover-up of an existing tattoo?'],
        suggestedStructure: 'Drawing/design fee, hourly tattoo rate, deposit.',
        pricingSafetyNote: 'Detailed realism or cover-ups usually require higher hourly rates or multiple sessions.',
        measurementWarning: 'Skin texture and exact sizing must be measured in person.'
    },
    notary: {
        tradeMode: 'notary',
        label: 'Notary',
        commonUnits: ['signature', 'visit'],
        inspectionFocus: 'Identify document types, volume of pages, and number of signers.',
        followUpQuestions: ['Do all signers have valid, unexpired government-issued ID?'],
        suggestedStructure: 'Per-signature fee, travel/mobile fee, loan signing package fee.',
        pricingSafetyNote: 'State laws heavily regulate per-signature fees; travel fees are usually negotiable.',
        measurementWarning: 'Document validity cannot be assessed until in person.'
    },
    pet_grooming: {
        tradeMode: 'pet_grooming',
        label: 'Pet Grooming',
        commonUnits: ['pet'],
        inspectionFocus: 'Identify breed size, coat type, matting, and apparent temperament.',
        followUpQuestions: ['Are there any known behavioral issues or extreme matting?'],
        suggestedStructure: 'Bath & brush, full groom, de-matting surcharge, nail trim.',
        pricingSafetyNote: 'Severe matting or aggressive behavior will incur additional handling fees.',
        measurementWarning: 'Undercoat condition and behavior can only be fully assessed in person.'
    },
    personal_training: {
        tradeMode: 'personal_training',
        label: 'Personal Training',
        commonUnits: ['session', 'month'],
        inspectionFocus: 'Identify workout environment (home gym, outdoors), available equipment, and space.',
        followUpQuestions: ['Do you have any pre-existing injuries or physical limitations?'],
        suggestedStructure: 'Assessment, individual session, monthly package, nutritional guidance.',
        pricingSafetyNote: 'Travel fees apply for in-home training.',
        measurementWarning: 'Client fitness level must be assessed during a physical evaluation.'
    },
    handyman: {
        tradeMode: 'handyman',
        label: 'Handyman',
        commonUnits: ['hour', 'job'],
        inspectionFocus: 'Identify the specific fixtures, damage, or installation requirements visible.',
        followUpQuestions: ['Do you have the replacement parts already purchased?'],
        suggestedStructure: 'Installation, repair, assembly, or patching tasks.',
        pricingSafetyNote: 'Use standard hourly handyman rates or flat task rates.',
        measurementWarning: 'Underlying structural issues may not be visible.'
    }
};

export function getTradePreset(tradeMode: string, customContextName?: string, customContextDescription?: string): TradePreset {
    if (tradeMode.startsWith('custom_') && customContextName) {
        return {
            tradeMode,
            label: customContextName,
            commonUnits: ['each', 'hour', 'project'],
            inspectionFocus: customContextDescription ? `Focus on: ${customContextDescription}` : `Focus on elements relevant to ${customContextName}.`,
            followUpQuestions: ['Can you provide more specific details about your expectations for this project?'],
            suggestedStructure: 'Custom line items tailored to the specific service request.',
            pricingSafetyNote: 'Provide reasonable estimates based on the custom context; note that custom work often has high variance.',
            measurementWarning: 'Measurements and scope must be verified in person for custom work.'
        };
    }

    return TRADE_PRESETS[tradeMode] || TRADE_PRESETS['general'];
}
