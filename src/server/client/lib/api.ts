import { treaty } from '@elysiajs/eden'
import type { ServerType } from '../../server'

export const client = treaty<ServerType>(document.location.origin);
