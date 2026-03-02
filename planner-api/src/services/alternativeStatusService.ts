import { Prisma } from '@prisma/client'

export const alternativeStatuses = [
  'draft',
  'angebot_gesendet',
  'bestellt',
  'abgeschlossen',
] as const

export type AlternativeStatus = (typeof alternativeStatuses)[number]

const allowedTransitions: Record<AlternativeStatus, AlternativeStatus[]> = {
  draft: ['angebot_gesendet'],
  angebot_gesendet: ['bestellt'],
  bestellt: ['abgeschlossen'],
  abgeschlossen: [],
}

export class AlternativeLockedError extends Error {}
export class AlternativeStatusTransitionError extends Error {}
export class AlternativeNotFoundInTenantScopeError extends Error {}

type LockedAlternativeRow = {
  id: string
  status: string
  locked_at: Date | null
  locked_by: string | null
}

type TransactionLike = {
  $queryRaw: <T = unknown>(query: Prisma.Sql) => Promise<T>
  alternative: {
    update: (args: unknown) => Promise<unknown>
  }
}

function isAlternativeStatus(value: string): value is AlternativeStatus {
  return (alternativeStatuses as readonly string[]).includes(value)
}

export const AlternativeStatusService = {
  canTransition(from: AlternativeStatus, to: AlternativeStatus) {
    return allowedTransitions[from].includes(to)
  },

  assertTransition(from: AlternativeStatus, to: AlternativeStatus) {
    if (!this.canTransition(from, to)) {
      throw new AlternativeStatusTransitionError(`Cannot transition alternative from ${from} to ${to}`)
    }
  },

  canEditPurchasePrice(status: string) {
    return status === 'bestellt'
  },

  async lock(
    tx: TransactionLike,
    alternativeId: string,
    tenantId: string,
    userId: string,
  ) {
    const rows = await tx.$queryRaw<LockedAlternativeRow[]>(Prisma.sql`
      SELECT a.id, a.status, a.locked_at, a.locked_by
      FROM alternatives a
      INNER JOIN areas ar ON ar.id = a.area_id
      INNER JOIN projects p ON p.id = ar.project_id
      WHERE a.id = ${alternativeId} AND p.tenant_id = ${tenantId}
      FOR UPDATE
    `)

    const alternative = rows[0]
    if (!alternative) {
      throw new AlternativeNotFoundInTenantScopeError('Alternative not found in tenant scope')
    }

    if (alternative.locked_at || alternative.status !== 'draft') {
      throw new AlternativeLockedError('Alternative is already locked')
    }

    const now = new Date()

    return tx.alternative.update({
      where: { id: alternativeId },
      data: {
        status: 'angebot_gesendet',
        locked_at: now,
        locked_by: userId,
      },
    })
  },
}
