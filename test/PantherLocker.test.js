const { expectRevert } = require('@openzeppelin/test-helpers');
const { assert } = require("chai");
const PonyLocker = artifacts.require('PonyLocker');
const MockBEP20 = artifacts.require('libs/MockBEP20');


contract('PonyLocker', ([alice, bob, carol, owner]) => {
    beforeEach(async () => {
        this.lp1 = await MockBEP20.new('LPToken', 'LP1', '1000000', { from: owner });
        this.ponyLocker = await PonyLocker.new({ from: owner });
    });

    it('only owner', async () => {
        assert.equal((await this.ponyLocker.owner()), owner);

        // lock
        await this.lp1.transfer(this.ponyLocker.address, '2000', { from: owner });
        assert.equal((await this.lp1.balanceOf(this.ponyLocker.address)).toString(), '2000');

        await expectRevert(this.ponyLocker.unlock(this.lp1.address, bob, { from: bob }), 'Ownable: caller is not the owner');
        await this.ponyLocker.unlock(this.lp1.address, carol, { from: owner });
        assert.equal((await this.lp1.balanceOf(carol)).toString(), '2000');
        assert.equal((await this.lp1.balanceOf(this.ponyLocker.address)).toString(), '0');
    });
})
