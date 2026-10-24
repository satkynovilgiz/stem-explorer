/*
 * Sample datasets for the descriptive-statistics section. Each says where it comes from: textbook
 * example data (reproduced as numbers only, with the section cited) or synthetic values made up
 * for this app and labelled as such. None are real measurements collected for this app.
 */

export interface SampleDataset {
  id: string
  name: string
  unit: string
  values: readonly number[]
  provenance: string
  /** A source id when the values come from a cited example. */
  source?: string
  synthetic: boolean
}

export const SAMPLE_DATASETS: readonly SampleDataset[] = [
  {
    id: 'heights',
    name: 'Heights of 40 students',
    unit: 'in',
    values: [59, 60, 61, 62, 62, 63, 63, 64, 64, 64, 65, 65, 65, 65, 65, 65, 65, 65, 65, 66, 66, 67, 67, 68, 68, 69, 70, 70, 70, 70, 70, 71, 71, 72, 72, 73, 74, 74, 75, 77],
    provenance: 'Example data from OpenStax Introductory Statistics 2e, Example 2.23 (box plots). The textbook gives Q1 = 64.5, median 66 and Q3 = 70.',
    source: 'stat-2-4',
    synthetic: false,
  },
  {
    id: 'location-example',
    name: 'Fourteen values (textbook example)',
    unit: '',
    values: [1, 1, 2, 2, 4, 6, 6.8, 7.2, 8, 8.3, 9, 10, 10, 11.5],
    provenance: 'Example data from OpenStax Introductory Statistics 2e, §2.3 (quartiles), with no units. The textbook gives a median of 7, Q1 = 2 and Q3 = 9.',
    source: 'stat-2-3',
    synthetic: false,
  },
  {
    id: 'synthetic-negative',
    name: 'Synthetic: negative and repeated values',
    unit: '',
    values: [-4, -2, -2, 0, 1, 1, 1, 3, 5, 6, 6],
    provenance: 'Synthetic values made up for this app to show negative and repeated numbers. Not measurements.',
    synthetic: true,
  },
  {
    id: 'synthetic-outlier',
    name: 'Synthetic: one potential outlier',
    unit: '',
    values: [12, 13, 13, 14, 15, 15, 16, 17, 18, 45],
    provenance: 'Synthetic values made up for this app; 45 lies more than 1.5 × IQR above Q3. Not measurements.',
    synthetic: true,
  },
]

export const DEFAULT_DATASET = 'heights'
export const findDataset = (id: string) => SAMPLE_DATASETS.find((d) => d.id === id)
