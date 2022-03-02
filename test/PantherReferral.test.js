const { expectRevert } = require('@openzeppelin/test-helpers');
const { assert } = require("chai");

const PonyReferral = artifacts.require('PonyReferral');

contract('PonyReferral', ([alice, bob, carol, referrer, operator, owner]) => {
    beforeEach(async () => {
        this.ponyReferral = await PonyReferral.new({ from: owner });
        this.zeroAddress = '0x0000000000000000000000000000000000000000';
    });

    it('should allow operator and only owner to update operator', async () => {
        assert.equal((await this.ponyReferral.operators(operator)).valueOf(), false);
        await expectRevert(this.ponyReferral.recordReferral(alice, referrer, { from: operator }), 'Operator: caller is not the operator');

        await expectRevert(this.ponyReferral.updateOperator(operator, true, { from: carol }), 'Ownable: caller is not the owner');
        await this.ponyReferral.updateOperator(operator, true, { from: owner });
        assert.equal((await this.ponyReferral.operators(operator)).valueOf(), true);

        await this.ponyReferral.updateOperator(operator, false, { from: owner });
        assert.equal((await this.ponyReferral.operators(operator)).valueOf(), false);
        await expectRevert(this.ponyReferral.recordReferral(alice, referrer, { from: operator }), 'Operator: caller is not the operator');
    });

    it('record referral', async () => {
        assert.equal((await this.ponyReferral.operators(operator)).valueOf(), false);
        await this.ponyReferral.updateOperator(operator, true, { from: owner });
        assert.equal((await this.ponyReferral.operators(operator)).valueOf(), true);

        await this.ponyReferral.recordReferral(this.zeroAddress, referrer, { from: operator });
        await this.ponyReferral.recordReferral(alice, this.zeroAddress, { from: operator });
        await this.ponyReferral.recordReferral(this.zeroAddress, this.zeroAddress, { from: operator });
        await this.ponyReferral.recordReferral(alice, alice, { from: operator });
        assert.equal((await this.ponyReferral.getReferrer(alice)).valueOf(), this.zeroAddress);
        assert.equal((await this.ponyReferral.referralsCount(referrer)).valueOf(), '0');

        await this.ponyReferral.recordReferral(alice, referrer, { from: operator });
        assert.equal((await this.ponyReferral.getReferrer(alice)).valueOf(), referrer);
        assert.equal((await this.ponyReferral.referralsCount(referrer)).valueOf(), '1');

        assert.equal((await this.ponyReferral.referralsCount(bob)).valueOf(), '0');
        await this.ponyReferral.recordReferral(alice, bob, { from: operator });
        assert.equal((await this.ponyReferral.referralsCount(bob)).valueOf(), '0');
        assert.equal((await this.ponyReferral.getReferrer(alice)).valueOf(), referrer);

        await this.ponyReferral.recordReferral(carol, referrer, { from: operator });
        assert.equal((await this.ponyReferral.getReferrer(carol)).valueOf(), referrer);
        assert.equal((await this.ponyReferral.referralsCount(referrer)).valueOf(), '2');
    });

    it('record referral commission', async () => {
        assert.equal((await this.ponyReferral.totalReferralCommissions(referrer)).valueOf(), '0');

        await expectRevert(this.ponyReferral.recordReferralCommission(referrer, 1, { from: operator }), 'Operator: caller is not the operator');
        await this.ponyReferral.updateOperator(operator, true, { from: owner });
        assert.equal((await this.ponyReferral.operators(operator)).valueOf(), true);

        await this.ponyReferral.recordReferralCommission(referrer, 1, { from: operator });
        assert.equal((await this.ponyReferral.totalReferralCommissions(referrer)).valueOf(), '1');

        await this.ponyReferral.recordReferralCommission(referrer, 0, { from: operator });
        assert.equal((await this.ponyReferral.totalReferralCommissions(referrer)).valueOf(), '1');

        await this.ponyReferral.recordReferralCommission(referrer, 111, { from: operator });
        assert.equal((await this.ponyReferral.totalReferralCommissions(referrer)).valueOf(), '112');

        await this.ponyReferral.recordReferralCommission(this.zeroAddress, 100, { from: operator });
        assert.equal((await this.ponyReferral.totalReferralCommissions(this.zeroAddress)).valueOf(), '0');
    });
});
