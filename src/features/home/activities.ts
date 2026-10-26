import { ANATOMY_ACTIVITY } from '../anatomy/activity'
import { BIOLOGY_ACTIVITY } from '../biology/activity'
import { CHEMISTRY_ACTIVITY } from '../chemistry/activity'
import { MATHEMATICS_ACTIVITY } from '../mathematics/activity'
import { PHYSICS_ACTIVITY } from '../physics/activity'

/**
 * The guided activities, in subject order. Home lists them as investigations: a click opens the
 * subject with the activity's introduction showing; nothing changes until Start is pressed there.
 * The link itself is the plain subject route, so opening it in a new tab simply opens the explorer.
 */
export const ACTIVITIES = [ANATOMY_ACTIVITY, CHEMISTRY_ACTIVITY, PHYSICS_ACTIVITY, MATHEMATICS_ACTIVITY, BIOLOGY_ACTIVITY]
