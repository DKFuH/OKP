import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  AlternativeLockedError,
  AlternativeNotFoundInTenantScopeError,
  AlternativeStatusService,
  AlternativeStatusTransitionError,
} from './alternativeStatusService.js'

describe('AlternativeStatusService', () => {
  describe('status machine', () => {
    it('allows draft to angebot_gesendet', () => {
      expect(AlternativeStatusService.canTransition('draft', 'angebot_gesendet')).toBe(true)
    })

    it('allows angebot_gesendet to bestellt', () => {
      expect(AlternativeStatusService.canTransition('angebot_gesendet', 'bestellt')).toBe(true)
    })

    it('allows bestellt to abgeschlossen', () => {
      expect(AlternativeStatusService.canTransition('bestellt', 'abgeschlossen')).toBe(true)
    })

    it('rejects skipping directly from draft to bestellt', () => {
      expect(() => AlternativeStatusService.assertTransition('draft', 'bestellt')).toThrow(AlternativeStatusTransitionError)
    })

    it('rejects transitions out of abgeschlossen', () => {
      expect(AlternativeStatusService.canTransition('abgeschlossen', 'draft')).toBe(false)
    })
  })

  describe('purchase price edit guard', () => {
    it('allows purchase price edits on bestellt alternatives', () => {
      expect(AlternativeStatusService.canEditPurchasePrice('bestellt')).toBe(true)
    })

    it('blocks purchase price edits on draft alternatives', () => {
      expect(AlternativeStatusService.canEditPurchasePrice('draft')).toBe(false)
    })

    it('blocks purchase price edits on angebot_gesendet alternatives', () => {
      expect(AlternativeStatusService.canEditPurchasePrice('angebot_gesendet')).toBe(false)
    })
  })

  describe('lock guard', () => {
    const tx = {
      $queryRaw: vi.fn(),
      alternative: {
        update: vi.fn(),
      },
    }

    beforeEach(() => {
      vi.clearAllMocks()
      tx.alternative.update.mockImplementation(async (args: { data: Record<string, unknown> }) => ({
        id: 'alt-1',
        ...args.data,
      }))
    })

    it('locks a draft alternative in tenant scope', async () => {
      tx.$queryRaw.mockResolvedValue([
        { id: 'alt-1', status: 'draft', locked_at: null, locked_by: null },
      ])

      const result = await AlternativeStatusService.lock(tx, 'alt-1', 'tenant-1', 'user-1')

      expect(tx.alternative.update).toHaveBeenCalledOnce()
      expect(result).toMatchObject({
        id: 'alt-1',
        status: 'angebot_gesendet',
        locked_by: 'user-1',
      })
    })

    it('throws when alternative is already locked', async () => {
      tx.$queryRaw.mockResolvedValue([
        { id: 'alt-1', status: 'angebot_gesendet', locked_at: new Date('2026-03-02T08:00:00.000Z'), locked_by: 'user-1' },
      ])

      await expect(AlternativeStatusService.lock(tx, 'alt-1', 'tenant-1', 'user-2')).rejects.toThrow(AlternativeLockedError)
    })

    it('throws when alternative is outside tenant scope', async () => {
      tx.$queryRaw.mockResolvedValue([])

      await expect(AlternativeStatusService.lock(tx, 'alt-1', 'tenant-1', 'user-1')).rejects.toThrow(AlternativeNotFoundInTenantScopeError)
    })
  })
})
