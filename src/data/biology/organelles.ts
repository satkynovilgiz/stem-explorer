import type { BiologySource, CellType, Organelle, OrganelleId } from './types'

/*
 * Content is written for beginning college students and checked against the OpenStax
 * pages below (Biology 2e and Anatomy & Physiology 2e, CC BY 4.0). Each statement is
 * paraphrased; see `sourceIds` on every entry for where it comes from.
 */
export const BIOLOGY_SOURCES: Record<string, BiologySource> = {
  'bio-4-3': {
    id: 'bio-4-3',
    label: 'OpenStax Biology 2e — 4.3 Eukaryotic Cells',
    url: 'https://openstax.org/books/biology-2e/pages/4-3-eukaryotic-cells',
  },
  'bio-4-4': {
    id: 'bio-4-4',
    label: 'OpenStax Biology 2e — 4.4 The Endomembrane System and Proteins',
    url: 'https://openstax.org/books/biology-2e/pages/4-4-the-endomembrane-system-and-proteins',
  },
  'bio-5-1': {
    id: 'bio-5-1',
    label: 'OpenStax Biology 2e — 5.1 Components and Structure',
    url: 'https://openstax.org/books/biology-2e/pages/5-1-components-and-structure',
  },
  'bio-15-5': {
    id: 'bio-15-5',
    label: 'OpenStax Biology 2e — 15.5 Ribosomes and Protein Synthesis',
    url: 'https://openstax.org/books/biology-2e/pages/15-5-ribosomes-and-protein-synthesis',
  },
  'ap-3-2': {
    id: 'ap-3-2',
    label: 'OpenStax Anatomy and Physiology 2e — 3.2 The Cytoplasm and Cellular Organelles',
    url: 'https://openstax.org/books/anatomy-and-physiology-2e/pages/3-2-the-cytoplasm-and-cellular-organelles',
  },
  'ap-3-3': {
    id: 'ap-3-3',
    label: 'OpenStax Anatomy and Physiology 2e — 3.3 The Nucleus and DNA Replication',
    url: 'https://openstax.org/books/anatomy-and-physiology-2e/pages/3-3-the-nucleus-and-dna-replication',
  },
}

export const CELL_DISCLAIMERS: Record<CellType, string> = {
  animal:
    'This is a simplified educational model of a generalized animal cell. Shapes, sizes, quantities, and positions are schematic; actual cells vary.',
  plant:
    'This is a simplified educational model of a generalized plant cell. Shapes, sizes, quantities, and positions are schematic and not to scale; actual plant cells vary widely.',
}

/** @deprecated kept for existing imports; use CELL_DISCLAIMERS. */
export const CELL_DISCLAIMER = CELL_DISCLAIMERS.animal

export const COLOR_NOTE =
  'Colors are illustrative labels for telling structures apart. Real organelles are mostly colorless and are seen with stains or other imaging techniques.'

export const ORGANELLES: readonly Organelle[] = [
  {
    id: 'plasma-membrane',
    name: 'Plasma membrane',
    tag: 'Selective boundary',
    summary:
      'The thin, flexible boundary that surrounds the cell’s contents and controls what enters and leaves. In plant cells it lies just inside the cell wall.',
    functions: [
      'Separates the inside of the cell from its surroundings.',
      'Is selectively permeable: it lets some substances through, keeps others out, and moves still others in controlled amounts.',
      'Carries proteins and carbohydrate chains used for cell recognition and signaling.',
    ],
    structure:
      'A phospholipid bilayer — two layers of lipids with water-attracting heads facing outward and water-repelling tails facing each other — with proteins, cholesterol, and carbohydrates embedded in or attached to it. This arrangement is described by the fluid mosaic model. The membrane is only about 5–10 nm thick.',
    relationships: [
      { targetId: 'cytoplasm', text: 'Encloses the cytoplasm.' },
      {
        targetId: 'golgi',
        text: 'Secretory vesicles from the Golgi apparatus fuse with the plasma membrane to release their contents outside the cell.',
      },
    ],
    glossary: [
      { term: 'Phospholipid bilayer', definition: 'A double layer of phospholipid molecules that forms the basic fabric of cell membranes.' },
      { term: 'Selectively permeable', definition: 'Allowing some substances to cross while blocking others.' },
      { term: 'Fluid mosaic model', definition: 'The description of a membrane as a flexible mix of lipids, proteins and carbohydrates that can move within the layer.' },
    ],
    simplifications: [
      'Drawn as a smooth, solid surface. A real membrane is a fluid lipid bilayer studded with proteins, and is far thinner relative to the cell than shown.',
      'In the animal model the cell is drawn as a rounded ball; in the plant model the membrane lines a box-shaped cell wall. Real cells take many shapes depending on their type and surroundings.',
    ],
    sourceIds: ['bio-4-3', 'bio-5-1'],
    color: '#5fb3c9',
    majorLabel: true,
    internal: false,
  },
  {
    id: 'cytoplasm',
    name: 'Cytoplasm',
    tag: 'Everything inside the membrane, outside the nucleus',
    summary:
      'The whole region between the plasma membrane and the nuclear envelope: the organelles plus the gel-like fluid they sit in.',
    functions: [
      'Holds the organelles and the cytoskeleton in place within the cell.',
      'Its fluid part, the cytosol, provides the medium for many of the cell’s chemical reactions.',
    ],
    structure:
      'Cytoplasm and cytosol are not the same thing. The cytosol is the jelly-like fluid itself — mostly water with dissolved ions and molecules. The cytoplasm is the cytosol together with the organelles and the cytoskeleton (a network of protein fibers) suspended in it.',
    relationships: [
      { targetId: 'plasma-membrane', text: 'Bounded on the outside by the plasma membrane.' },
      { targetId: 'nucleus', text: 'Ends at the nuclear envelope; the material inside the nucleus is called nucleoplasm.' },
      { targetId: 'ribosome', text: 'Free ribosomes float in the cytosol.' },
    ],
    glossary: [
      { term: 'Cytosol', definition: 'The gel-like fluid of the cytoplasm, without the organelles.' },
      { term: 'Cytoskeleton', definition: 'A network of protein fibers that gives the cell shape and helps move materials inside it.' },
    ],
    simplifications: [
      'Shown as a pale inner surface behind the organelles. Real cytoplasm is crowded with molecules and organelles in three dimensions.',
      'The cytoskeleton is not drawn.',
    ],
    sourceIds: ['bio-4-3', 'ap-3-2'],
    color: '#2c4a52',
    majorLabel: false,
    internal: true,
  },
  {
    id: 'nucleus',
    name: 'Nucleus',
    tag: 'Holds the DNA',
    summary: 'Usually the most prominent organelle; it houses the cell’s DNA and directs protein production.',
    functions: [
      'Houses the cell’s DNA, stored as chromatin.',
      'Directs the synthesis of ribosomes and proteins.',
      'Its pores control the passage of ions, molecules and RNA between the nucleus and the cytoplasm.',
    ],
    structure:
      'Surrounded by the nuclear envelope: two lipid bilayers with a thin space between them. Nuclear pores cross the envelope and control the passage of ions, molecules and RNA. Inside, the gel-like nucleoplasm holds chromatin — DNA wrapped around proteins.',
    relationships: [
      { targetId: 'nucleolus', text: 'Contains the nucleolus.' },
      { targetId: 'rough-er', text: 'The nuclear envelope is continuous with the endoplasmic reticulum.' },
      { targetId: 'ribosome', text: 'Ribosomal subunits made in the nucleolus leave through the nuclear pores.' },
    ],
    glossary: [
      { term: 'Nuclear envelope', definition: 'The double membrane that surrounds the nucleus.' },
      { term: 'Nuclear pore', definition: 'A protein-lined channel through the nuclear envelope.' },
      { term: 'Chromatin', definition: 'DNA together with the proteins it is wrapped around.' },
    ],
    simplifications: [
      'Pores are shown as a few dark dots; a real nucleus has many more.',
      'Chromatin is not drawn.',
    ],
    sourceIds: ['bio-4-3', 'ap-3-3'],
    color: '#7b6fd6',
    majorLabel: true,
    internal: true,
  },
  {
    id: 'nucleolus',
    name: 'Nucleolus',
    tag: 'Ribosome assembly, inside the nucleus',
    summary: 'A dense region inside the nucleus where ribosomal RNA is made and ribosome subunits are assembled.',
    functions: [
      'Makes ribosomal RNA (rRNA).',
      'Combines rRNA with proteins to build ribosomal subunits, which then leave the nucleus through nuclear pores.',
    ],
    structure: 'A darkly staining area within the nucleus. It is not surrounded by its own membrane.',
    relationships: [
      { targetId: 'nucleus', text: 'Located inside the nucleus.' },
      { targetId: 'ribosome', text: 'Builds the subunits that become ribosomes in the cytoplasm.' },
    ],
    glossary: [{ term: 'Ribosomal RNA (rRNA)', definition: 'RNA that forms part of the structure of ribosomes.' }],
    simplifications: ['Shown as a single smooth sphere; a nucleus can have more than one nucleolus, and its shape is irregular.'],
    sourceIds: ['bio-4-3', 'ap-3-3'],
    color: '#c9a2f2',
    majorLabel: false,
    internal: true,
  },
  {
    id: 'mitochondrion',
    name: 'Mitochondria',
    instanceName: 'Mitochondrion',
    tag: 'ATP production',
    summary:
      'Oval, double-membrane organelles that produce most of the cell’s ATP, the molecule cells use to carry energy.',
    functions: [
      'Carry out cellular respiration, converting energy from nutrients into ATP.',
      'Cells that use a lot of energy, such as muscle cells, contain many mitochondria.',
    ],
    structure:
      'Two membranes: a smooth outer membrane and a folded inner membrane. The folds are called cristae; the space they enclose is the matrix. Mitochondria have their own DNA and ribosomes.',
    relationships: [
      { targetId: 'cytoplasm', text: 'Sit in the cytoplasm, often where energy demand is high.' },
      {
        targetId: 'ribosome',
        text: 'Some proteins made by ribosomes in the cytosol carry a signal sequence that directs them to mitochondria.',
      },
    ],
    glossary: [
      { term: 'ATP (adenosine triphosphate)', definition: 'The cell’s main short-term energy-carrying molecule.' },
      { term: 'Cristae', definition: 'Folds of the inner mitochondrial membrane.' },
      { term: 'Matrix', definition: 'The space inside the inner mitochondrial membrane.' },
    ],
    simplifications: [
      'Four mitochondria are shown. Real cells contain from a few to thousands, depending on cell type.',
      'Each is drawn cut in half lengthwise so the folded inner membrane is visible.',
    ],
    sourceIds: ['bio-4-3', 'ap-3-2', 'bio-15-5'],
    color: '#e8875a',
    majorLabel: true,
    internal: true,
  },
  {
    id: 'rough-er',
    name: 'Rough endoplasmic reticulum',
    tag: 'Ribosome-studded membranes',
    summary:
      'A network of flattened membrane sacs, studded with ribosomes, where many membrane and secreted proteins are made and modified.',
    functions: [
      'Ribosomes on its surface make proteins that enter the ER, mainly those headed for membranes or for export from the cell.',
      'Modifies these proteins, for example by folding them or adding side chains.',
      'Makes phospholipids for cell membranes.',
      'Sends products onward in transport vesicles, often to the Golgi apparatus.',
    ],
    structure:
      'Interconnected membrane sacs called cisternae. The space inside is the lumen. Ribosomes attached to the outer (cytoplasmic) surface give it a “rough” look under the microscope.',
    relationships: [
      { targetId: 'nucleus', text: 'Its membrane is continuous with the nuclear envelope.' },
      { targetId: 'smooth-er', text: 'Continuous with the smooth ER.' },
      { targetId: 'ribosome', text: 'Ribosomes bind to its surface while making certain proteins.' },
      { targetId: 'golgi', text: 'Transport vesicles carry many of its products to the Golgi apparatus.' },
    ],
    glossary: [
      { term: 'Cisternae', definition: 'Flattened membrane sacs.' },
      { term: 'Lumen', definition: 'The inner space of a membrane-bound compartment.' },
      { term: 'Endomembrane system', definition: 'The group of connected membranes — nuclear envelope, ER, Golgi, lysosomes and vesicles — that make, modify and move lipids and proteins.' },
    ],
    simplifications: [
      'Drawn as a few curved sheets beside the nucleus; the real network is much larger and folded throughout the cell.',
      'Attached ribosomes are shown as evenly spaced dots.',
    ],
    sourceIds: ['bio-4-4', 'ap-3-2'],
    color: '#4f9fe0',
    majorLabel: true,
    internal: true,
  },
  {
    id: 'smooth-er',
    name: 'Smooth endoplasmic reticulum',
    tag: 'Lipids, detoxification, calcium',
    summary: 'The part of the ER with few or no ribosomes, mostly made of tubes, specialized for lipids and other tasks.',
    functions: [
      'Makes lipids, including phospholipids and steroid hormones, and carbohydrates.',
      'Helps detoxify medications and poisons.',
      'Stores calcium ions; in muscle cells a specialized smooth ER releases calcium for contraction.',
    ],
    structure: 'A network of membrane tubules continuous with the rough ER, with few or no ribosomes on its surface.',
    relationships: [
      { targetId: 'rough-er', text: 'Continuous with the rough ER.' },
      { targetId: 'golgi', text: 'Part of the endomembrane system with the Golgi apparatus.' },
    ],
    glossary: [{ term: 'Detoxification', definition: 'Chemically changing harmful substances so they can be removed.' }],
    simplifications: ['Shown as a few separate tubes; in cells it forms a connected network whose size varies greatly by cell type.'],
    sourceIds: ['bio-4-4', 'ap-3-2'],
    color: '#57c49a',
    majorLabel: true,
    internal: true,
  },
  {
    id: 'golgi',
    name: 'Golgi apparatus',
    tag: 'Modify, sort and ship',
    summary:
      'A stack of flattened membrane sacs that modifies, sorts and packages lipids and proteins arriving from the ER.',
    functions: [
      'Receives transport vesicles from the ER at its cis face (the side nearest the ER).',
      'Further modifies proteins, for example by adding short sugar chains, and tags them for their destinations.',
      'Packages products into vesicles that bud from its trans face. Some deliver their contents to other parts of the cell; others fuse with the plasma membrane and release their contents outside the cell.',
    ],
    structure:
      'A series of flattened, curved sacs with a receiving (cis) face and a shipping (trans) face, surrounded by small vesicles.',
    relationships: [
      { targetId: 'rough-er', text: 'Receives proteins and lipids from the ER in transport vesicles.' },
      { targetId: 'lysosome', text: 'Both belong to the endomembrane system, along with the ER, the nuclear envelope and vesicles.' },
      { targetId: 'plasma-membrane', text: 'Secretory vesicles fuse with the plasma membrane to release their contents.' },
      {
        targetId: 'ribosome',
        text: 'Not every protein passes through the Golgi. Signal sequences can send proteins to other destinations, such as mitochondria.',
      },
    ],
    glossary: [
      { term: 'Cis and trans faces', definition: 'The receiving side (nearest the ER) and the shipping side of the Golgi stack.' },
      { term: 'Vesicle', definition: 'A small membrane bubble that carries materials within the cell.' },
    ],
    simplifications: ['One stack of five sacs is shown; cells may have several stacks.'],
    sourceIds: ['bio-4-4', 'ap-3-2', 'bio-15-5'],
    color: '#f2c45a',
    majorLabel: true,
    internal: true,
  },
  {
    id: 'ribosome',
    name: 'Ribosomes',
    tag: 'Protein synthesis',
    summary:
      'Tiny complexes of RNA and protein that build proteins by reading messenger RNA (mRNA). They are not surrounded by a membrane.',
    functions: [
      'Translate the code in mRNA into a chain of amino acids — a protein.',
      'Some float freely in the cytosol. Proteins made there can carry signal sequences that direct them to organelles such as mitochondria.',
      'Others are bound to the rough ER while making proteins destined for membranes or for export from the cell.',
    ],
    structure:
      'Two subunits, one large and one small, built from ribosomal RNA and many proteins. They occur free in the cytoplasm or attached to the cytoplasmic side of the ER and the plasma membrane.',
    relationships: [
      { targetId: 'nucleolus', text: 'Their subunits are assembled in the nucleolus.' },
      { targetId: 'rough-er', text: 'Bound ribosomes give the rough ER its name.' },
      { targetId: 'cytoplasm', text: 'Free ribosomes sit in the cytosol.' },
    ],
    glossary: [
      { term: 'Messenger RNA (mRNA)', definition: 'RNA that carries the instructions for a protein from DNA to the ribosome.' },
      { term: 'Signal sequence', definition: 'A short stretch at one end of a protein that directs it to a particular part of the cell.' },
    ],
    simplifications: [
      'Shown as dots and greatly enlarged: real ribosomes are far too small to see with a light microscope.',
      'A cell holds a great many ribosomes; only a few dozen are drawn. The dots are selected as one group.',
    ],
    sourceIds: ['bio-4-3', 'bio-15-5'],
    color: '#e6e1cf',
    majorLabel: false,
    internal: true,
  },
  {
    id: 'lysosome',
    name: 'Lysosomes',
    instanceName: 'Lysosome',
    tag: 'Digestion and recycling',
    summary:
      'Small membrane-bound sacs of digestive enzymes that break down unneeded materials. Animal cells have them; most plant cells do not.',
    functions: [
      'Break down proteins, polysaccharides, lipids, nucleic acids and worn-out organelles using hydrolytic enzymes.',
      'Recycle the cell’s own components (autophagy, “self-eating”).',
      'Destroy material taken into the cell, such as pathogens engulfed by macrophages (a type of white blood cell).',
    ],
    structure:
      'A membrane-bound sac with an acidic interior. Its enzymes are active at a much lower pH than that of the cytoplasm.',
    relationships: [
      { targetId: 'golgi', text: 'Part of the endomembrane system with the Golgi apparatus and ER.' },
      { targetId: 'mitochondrion', text: 'Can break down worn-out organelles, including mitochondria.' },
    ],
    glossary: [
      { term: 'Hydrolytic enzyme', definition: 'An enzyme that breaks molecules apart by adding water.' },
      { term: 'Autophagy', definition: 'The breakdown and recycling of a cell’s own components.' },
    ],
    simplifications: ['Three lysosomes of equal size are shown; real numbers and sizes vary.'],
    sourceIds: ['bio-4-3', 'bio-4-4', 'ap-3-2'],
    color: '#d46a9f',
    majorLabel: true,
    internal: true,
  },
  {
    id: 'cell-wall',
    name: 'Cell wall',
    tag: 'Rigid outer support',
    summary:
      'A rigid layer outside the plasma membrane that protects the plant cell, supports it and gives it its shape. It is a separate structure from the membrane.',
    functions: [
      'Gives the cell its shape and keeps it from bursting.',
      'Provides structural support; when the central vacuole holds less water, the wall is left unsupported and the plant wilts.',
      'Protects the cell.',
    ],
    structure:
      'Made mainly of cellulose, a polysaccharide built from glucose units. It lies outside the plasma membrane; the membrane, not the wall, controls what enters and leaves the cell.',
    relationships: [
      { targetId: 'plasma-membrane', text: 'Lies outside the plasma membrane. The wall supports; the membrane is the selective barrier.' },
      { targetId: 'central-vacuole', text: 'Water pressure from the central vacuole pushes the cell against its wall, keeping it firm.' },
      { targetId: 'golgi', text: 'In plant cells the Golgi apparatus also makes polysaccharides, some of which go into the cell wall.' },
    ],
    glossary: [{ term: 'Cellulose', definition: 'A polysaccharide made of glucose units; the main component of plant cell walls.' }],
    simplifications: ['Drawn as a smooth box of even thickness. Real walls vary in thickness and layers, and connect to neighbouring cells.'],
    sourceIds: ['bio-4-3', 'bio-4-4'],
    color: '#9bbf6a',
    majorLabel: true,
    internal: false,
  },
  {
    id: 'chloroplast',
    name: 'Chloroplasts',
    instanceName: 'Chloroplast',
    tag: 'Photosynthesis',
    summary:
      'Organelles that carry out photosynthesis, using carbon dioxide, water and light energy to make glucose and oxygen.',
    functions: ['Carry out photosynthesis, so the plant makes its own food.'],
    structure:
      'An outer and an inner membrane surround the stroma, a fluid around stacks of flattened membrane sacs called thylakoids; a stack is a granum. Chloroplasts have their own DNA and ribosomes.',
    relationships: [
      { targetId: 'mitochondrion', text: 'Plant cells have both: chloroplasts make glucose, and mitochondria release usable energy from it.' },
      { targetId: 'ribosome', text: 'Chloroplasts contain their own ribosomes and DNA.' },
    ],
    glossary: [
      { term: 'Photosynthesis', definition: 'The process that uses light energy, carbon dioxide and water to make glucose and oxygen.' },
      { term: 'Thylakoid', definition: 'A flattened membrane sac inside a chloroplast; stacks of thylakoids are called grana.' },
      { term: 'Stroma', definition: 'The fluid inside a chloroplast that surrounds the thylakoid stacks.' },
    ],
    simplifications: ['Five chloroplasts are shown; the number in real plant cells varies with the type of cell.'],
    sourceIds: ['bio-4-3'],
    color: '#4caf50',
    majorLabel: true,
    internal: true,
  },
  {
    id: 'central-vacuole',
    name: 'Central vacuole',
    tag: 'Water, support, storage',
    summary:
      'A large, membrane-bound compartment that regulates the cell’s water content, helps keep the cell firm, and stores materials.',
    functions: [
      'Regulates the concentration of water in the cell as conditions change.',
      'Its water pressure against the cell wall keeps the cell firm; when it loses water, the plant wilts.',
      'Lets the cell grow larger without making much more cytoplasm.',
      'Stores materials; the OpenStax text notes that digestion in plant cells takes place in vacuoles.',
    ],
    structure: 'A large sac of watery fluid enclosed by its own membrane. It can take up much of the cell’s volume.',
    relationships: [
      { targetId: 'vacuole-membrane', text: 'Enclosed by the vacuole membrane.' },
      { targetId: 'cell-wall', text: 'Presses outward against the cell wall, keeping the cell firm.' },
    ],
    glossary: [{ term: 'Turgor pressure', definition: 'The pressure of the vacuole’s water pushing the cell outward against its wall.' }],
    simplifications: ['Drawn as one smooth ellipsoid; its real size and shape change with the cell’s water content.'],
    sourceIds: ['bio-4-3'],
    color: '#5aa9d6',
    majorLabel: true,
    internal: true,
  },
  {
    id: 'vacuole-membrane',
    name: 'Vacuole membrane',
    tag: 'Boundary of the vacuole',
    summary: 'The membrane that surrounds the central vacuole and separates its contents from the cytoplasm.',
    functions: ['Keeps the vacuole’s contents separate from the cytoplasm around it.'],
    structure: 'A single membrane enclosing the central vacuole.',
    relationships: [{ targetId: 'central-vacuole', text: 'Encloses the central vacuole.' }],
    glossary: [],
    simplifications: ['Drawn as a smooth shell, opened in the cutaway so the vacuole inside can be selected.'],
    sourceIds: ['bio-4-3'],
    color: '#8fd0f0',
    majorLabel: false,
    internal: true,
  },
]

/** Which structures each simplified model contains (and therefore lists, draws and accepts in links). */
export const CELL_STRUCTURES: Record<CellType, readonly OrganelleId[]> = {
  animal: ['plasma-membrane', 'cytoplasm', 'nucleus', 'nucleolus', 'mitochondrion', 'rough-er', 'smooth-er', 'golgi', 'ribosome', 'lysosome'],
  plant: [
    'cell-wall',
    'plasma-membrane',
    'cytoplasm',
    'nucleus',
    'nucleolus',
    'chloroplast',
    'central-vacuole',
    'vacuole-membrane',
    'mitochondrion',
    'rough-er',
    'smooth-er',
    'golgi',
    'ribosome',
  ],
}

const COUNTS: Record<CellType, Partial<Record<OrganelleId, number>>> = {
  animal: { mitochondrion: 4, lysosome: 3 },
  plant: { mitochondrion: 3, chloroplast: 5 },
}

/** Number of separately selectable copies of a repeated structure in a model, or undefined. */
export function instanceCount(cellType: CellType, id: OrganelleId): number | undefined {
  return COUNTS[cellType][id]
}

export function hasStructure(cellType: CellType, id: string): id is OrganelleId {
  return (CELL_STRUCTURES[cellType] as readonly string[]).includes(id)
}

export function structuresOf(cellType: CellType): Organelle[] {
  return CELL_STRUCTURES[cellType].map((id) => findOrganelle(id)!)
}

/** Inside the outer surface, so hidden in the whole-cell view. In the plant model only the wall is outside. */
export function isInternal(cellType: CellType, id: OrganelleId): boolean {
  return cellType === 'plant' ? id !== 'cell-wall' : !!findOrganelle(id)?.internal
}

/** Link parameters that open a structure: in the animal model when it has it, otherwise in the plant model. */
export function structureParams(id: OrganelleId): Record<string, string> {
  const cellType: CellType = hasStructure('animal', id) ? 'animal' : 'plant'
  return { structure: id, cell: isInternal(cellType, id) ? 'cutaway' : 'whole', ...(cellType === 'plant' ? { type: 'plant' } : {}) }
}

/** The outer structure shown in the whole-cell view. */
export const OUTER_STRUCTURE: Record<CellType, OrganelleId> = { animal: 'plasma-membrane', plant: 'cell-wall' }

/** How many copies of each repeated structure the model draws (selectable individually). */
/** @deprecated animal-model counts, kept for existing imports; use instanceCount(cellType, id). */
export const INSTANCE_COUNTS: Partial<Record<OrganelleId, number>> = COUNTS.animal

export function findOrganelle(id: string): Organelle | undefined {
  return ORGANELLES.find((o) => o.id === id)
}
