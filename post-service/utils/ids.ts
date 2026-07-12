import { ulid } from 'ulid'

/** Time-sortable, URL-safe unique id. */
export function newImageId(): string {
  return ulid()
}

export default { newImageId }
