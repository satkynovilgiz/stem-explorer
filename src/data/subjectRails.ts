import { Activity, Bone, Calculator, ChartColumn, ChartLine, CircuitBoard, Cloud, Dna, Droplets, Eye, Gauge, HeartPulse, Layers, Microscope, MoveUpRight, PersonStanding, Puzzle, Rocket, Shuffle, Split, Users, Waves, Wind, Zap, type LucideIcon } from 'lucide-react'
import type { SubjectId } from './subjects'
import { MODULES } from './topics'
import { calculatorsHref } from '../lib/overviewRoute'
import { moduleHref } from '../lib/moduleContext'

/**
 * One menu item: a module (data/topics.ts) or the subject's Calculators page. `href` and `asys`
 * narrow a module to one view of it (the body atlas showing one body system).
 */
export type RailItem = { label: string; icon: LucideIcon; module: string | 'calculators'; href?: string; asys?: string | null }
export type RailGroup = { heading: string | null; items: RailItem[] }

/** Subjects with a left menu here (Chemistry has its own in ChemNav.tsx). */
export type RailSubject = 'anatomy' | 'biology' | 'physics' | 'mathematics'
export const hasRail = (s: SubjectId): s is RailSubject => s !== 'chemistry'

/*
 * The left menus chosen for each subject. Labels are the words students use; every item opens an
 * existing page or view, so older links keep working.
 */
export const RAILS: Record<RailSubject, RailGroup[]> = {
  anatomy: [
    {
      heading: null,
      items: [
        { label: 'Bones', icon: Bone, module: 'anatomy.atlas', href: '?asys=skeletal#/anatomy', asys: 'skeletal' },
        { label: 'Muscles', icon: Activity, module: 'anatomy.atlas', href: '?asys=muscular#/anatomy', asys: 'muscular' },
        { label: 'Heart', icon: HeartPulse, module: 'anatomy.heart' },
        { label: 'Breathing', icon: Wind, module: 'anatomy.breathing' },
        { label: 'Whole body', icon: PersonStanding, module: 'anatomy.atlas', href: '?bview=front#/anatomy', asys: null },
        { label: 'Calculators', icon: Calculator, module: 'calculators' },
      ],
    },
  ],
  biology: [
    {
      heading: null,
      items: [
        { label: 'Cells', icon: Microscope, module: 'biology.cells' },
        { label: 'DNA', icon: Dna, module: 'biology.dna' },
        { label: 'Cell division', icon: Split, module: 'biology.division' },
        { label: 'Meiosis', icon: Shuffle, module: 'biology.meiosis' },
        { label: 'Inheritance', icon: Users, module: 'biology.inheritance' },
        { label: 'Energy', icon: Zap, module: 'biology.energy' },
        { label: 'Diffusion', icon: Droplets, module: 'biology.diffusion' },
        { label: 'Enzymes', icon: Puzzle, module: 'biology.enzymes' },
        { label: 'Calculators', icon: Calculator, module: 'calculators' },
      ],
    },
  ],
  physics: [
    { heading: 'Motion', items: [{ label: 'Throwing', icon: Rocket, module: 'physics.projectile' }, { label: 'Springs', icon: Activity, module: 'physics.spring' }] },
    { heading: 'Electricity', items: [{ label: 'Circuits', icon: CircuitBoard, module: 'physics.circuit' }] },
    { heading: 'Waves and light', items: [{ label: 'Waves', icon: Waves, module: 'physics.wave' }, { label: 'Lenses', icon: Eye, module: 'physics.optics' }] },
    { heading: 'Matter', items: [{ label: 'Gases', icon: Cloud, module: 'physics.gas' }, { label: 'Calculators', icon: Calculator, module: 'calculators' }] },
  ],
  mathematics: [
    { heading: 'Algebra', items: [{ label: 'Graphs', icon: ChartLine, module: 'mathematics.functions' }, { label: 'Vectors', icon: MoveUpRight, module: 'mathematics.vectors' }] },
    { heading: 'Calculus', items: [{ label: 'Motion', icon: Gauge, module: 'mathematics.motion' }, { label: '3D surfaces', icon: Layers, module: 'mathematics.surfaces' }] },
    { heading: 'Data', items: [{ label: 'Statistics', icon: ChartColumn, module: 'mathematics.statistics' }, { label: 'Calculators', icon: Calculator, module: 'calculators' }] },
  ],
}

export const railItems = (subject: RailSubject) => RAILS[subject].flatMap((g) => g.items)

/** Where an item leads: back to where the student left that section, as the old tabs did. */
export const railHref = (subject: SubjectId, item: RailItem) => item.href ?? (item.module === 'calculators' ? calculatorsHref(subject) : moduleHref(MODULES.find((m) => m.id === item.module)!).href)

