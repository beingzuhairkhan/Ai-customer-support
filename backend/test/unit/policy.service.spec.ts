import { PolicyService } from 'src/knowledge/policy.service';
import { OrderStatus } from 'src/common/enums';

describe('PolicyService', () => {
  let service: PolicyService;

  beforeEach(() => {
    service = new PolicyService();
  });

  describe('checkReturnEligibility', () => {
    it('should deny return when past 7-day window', () => {
      const decision = service.checkReturnEligibility({
        daysSinceDelivery: 20,
        productOpened: false,
        productUsed: false,
        originalPackaging: true,
      });
      expect(decision.allowed).toBe(false);
      expect(decision.policy).toBe('RETURN');
      expect(decision.suggestedResponse).toContain('7 days');
    });

    it('should deny return when product opened', () => {
      const decision = service.checkReturnEligibility({
        daysSinceDelivery: 3,
        productOpened: true,
        productUsed: false,
        originalPackaging: true,
      });
      expect(decision.allowed).toBe(false);
      expect(decision.reason).toContain('opened');
    });

    it('should deny return when product used', () => {
      const decision = service.checkReturnEligibility({
        daysSinceDelivery: 3,
        productOpened: false,
        productUsed: true,
        originalPackaging: true,
      });
      expect(decision.allowed).toBe(false);
      expect(decision.reason).toContain('used');
    });

    it('should allow return when all conditions met', () => {
      const decision = service.checkReturnEligibility({
        daysSinceDelivery: 5,
        productOpened: false,
        productUsed: false,
        originalPackaging: true,
      });
      expect(decision.allowed).toBe(true);
    });

    it('should handle the assessment example: 20 days, opened', () => {
      const decision = service.checkReturnEligibility({
        daysSinceDelivery: 20,
        productOpened: true,
        productUsed: true,
        originalPackaging: false,
      });
      expect(decision.allowed).toBe(false);
      expect(decision.suggestedResponse).toContain('return or refund');
    });
  });

  describe('checkCancellationEligibility', () => {
    it('should allow cancellation when PROCESSING', () => {
      const decision = service.checkCancellationEligibility(OrderStatus.PROCESSING);
      expect(decision.allowed).toBe(true);
    });

    it('should deny cancellation when OUT_FOR_DELIVERY', () => {
      const decision = service.checkCancellationEligibility(OrderStatus.OUT_FOR_DELIVERY);
      expect(decision.allowed).toBe(false);
      expect(decision.suggestedResponse).toContain('refuse');
    });

    it('should deny cancellation when SHIPPED', () => {
      const decision = service.checkCancellationEligibility(OrderStatus.SHIPPED);
      expect(decision.allowed).toBe(false);
    });

    it('should deny cancellation when DELIVERED', () => {
      const decision = service.checkCancellationEligibility(OrderStatus.DELIVERED);
      expect(decision.allowed).toBe(false);
      expect(decision.suggestedResponse).toContain('delivered');
    });
  });

  describe('checkCodEligibility', () => {
    it('should allow COD under 2500', () => {
      const decision = service.checkCodEligibility(699);
      expect(decision.allowed).toBe(true);
    });

    it('should deny COD over 2500', () => {
      const decision = service.checkCodEligibility(3000);
      expect(decision.allowed).toBe(false);
    });
  });

  describe('checkDamagedReport', () => {
    it('should deny when past 48 hours', () => {
      const decision = service.checkDamagedReport({ hoursSinceDelivery: 72, hasPhotos: true });
      expect(decision.allowed).toBe(false);
    });

    it('should deny when no photos', () => {
      const decision = service.checkDamagedReport({ hoursSinceDelivery: 24, hasPhotos: false });
      expect(decision.allowed).toBe(false);
    });

    it('should allow when within 48h with photos', () => {
      const decision = service.checkDamagedReport({ hoursSinceDelivery: 24, hasPhotos: true });
      expect(decision.allowed).toBe(true);
    });
  });

  describe('policy strings', () => {
    it('getShippingPolicy should mention free delivery', () => {
      expect(service.getShippingPolicy()).toContain('free delivery');
    });
    it('getReturnPolicy should mention 7 days', () => {
      expect(service.getReturnPolicy()).toContain('7 days');
    });
    it('getCodPolicy should mention 2,500', () => {
      expect(service.getCodPolicy()).toContain('2,500');
    });
  });
});
