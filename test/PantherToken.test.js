const { expectRevert } = require("@openzeppelin/test-helpers");
const { assert } = require("chai");

const PonyToken = artifacts.require('PonyToken');

contract('PonyToken', ([alice, bob, carol, operator, owner]) => {
    beforeEach(async () => {
        this.pony = await PonyToken.new({ from: owner });
        this.burnAddress = '0x000000000000000000000000000000000000dEaD';
        this.zeroAddress = '0x0000000000000000000000000000000000000000';
    });

    it('only operator', async () => {
        assert.equal((await this.pony.owner()), owner);
        assert.equal((await this.pony.operator()), owner);

        await expectRevert(this.pony.updateTransferTaxRate(500, { from: operator }), 'operator: caller is not the operator');
        await expectRevert(this.pony.updateBurnRate(20, { from: operator }), 'operator: caller is not the operator');
        await expectRevert(this.pony.updateMaxTransferAmountRate(100, { from: operator }), 'operator: caller is not the operator');
        await expectRevert(this.pony.updateSwapAndLiquifyEnabled(true, { from: operator }), 'operator: caller is not the operator');
        await expectRevert(this.pony.setExcludedFromAntiWhale(operator, { from: operator }), 'operator: caller is not the operator');
        await expectRevert(this.pony.updatePonySwapRouter(operator, { from: operator }), 'operator: caller is not the operator');
        await expectRevert(this.pony.updateMinAmountToLiquify(100, { from: operator }), 'operator: caller is not the operator');
        await expectRevert(this.pony.transferOperator(alice, { from: operator }), 'operator: caller is not the operator');
    });

    it('transfer operator', async () => {
        await expectRevert(this.pony.transferOperator(operator, { from: operator }), 'operator: caller is not the operator');
        await this.pony.transferOperator(operator, { from: owner });
        assert.equal((await this.pony.operator()), operator);

        await expectRevert(this.pony.transferOperator(this.zeroAddress, { from: operator }), 'PONY::transferOperator: new operator is the zero address');
    });

    it('update transfer tax rate', async () => {
        await this.pony.transferOperator(operator, { from: owner });
        assert.equal((await this.pony.operator()), operator);

        assert.equal((await this.pony.transferTaxRate()).toString(), '500');
        assert.equal((await this.pony.burnRate()).toString(), '20');

        await this.pony.updateTransferTaxRate(0, { from: operator });
        assert.equal((await this.pony.transferTaxRate()).toString(), '0');
        await this.pony.updateTransferTaxRate(1000, { from: operator });
        assert.equal((await this.pony.transferTaxRate()).toString(), '1000');
        await expectRevert(this.pony.updateTransferTaxRate(1001, { from: operator }), 'PONY::updateTransferTaxRate: Transfer tax rate must not exceed the maximum rate.');

        await this.pony.updateBurnRate(0, { from: operator });
        assert.equal((await this.pony.burnRate()).toString(), '0');
        await this.pony.updateBurnRate(100, { from: operator });
        assert.equal((await this.pony.burnRate()).toString(), '100');
        await expectRevert(this.pony.updateBurnRate(101, { from: operator }), 'PONY::updateBurnRate: Burn rate must not exceed the maximum rate.');
    });

    it('transfer', async () => {
        await this.pony.transferOperator(operator, { from: owner });
        assert.equal((await this.pony.operator()), operator);

        await this.pony.mint(alice, 10000000, { from: owner }); // max transfer amount 25,000
        assert.equal((await this.pony.balanceOf(alice)).toString(), '10000000');
        assert.equal((await this.pony.balanceOf(this.burnAddress)).toString(), '0');
        assert.equal((await this.pony.balanceOf(this.pony.address)).toString(), '0');

        await this.pony.transfer(bob, 12345, { from: alice });
        assert.equal((await this.pony.balanceOf(alice)).toString(), '9987655');
        assert.equal((await this.pony.balanceOf(bob)).toString(), '11728');
        assert.equal((await this.pony.balanceOf(this.burnAddress)).toString(), '123');
        assert.equal((await this.pony.balanceOf(this.pony.address)).toString(), '494');

        await this.pony.approve(carol, 22345, { from: alice });
        await this.pony.transferFrom(alice, carol, 22345, { from: carol });
        assert.equal((await this.pony.balanceOf(alice)).toString(), '9965310');
        assert.equal((await this.pony.balanceOf(carol)).toString(), '21228');
        assert.equal((await this.pony.balanceOf(this.burnAddress)).toString(), '346');
        assert.equal((await this.pony.balanceOf(this.pony.address)).toString(), '1388');
    });

    it('transfer small amount', async () => {
        await this.pony.transferOperator(operator, { from: owner });
        assert.equal((await this.pony.operator()), operator);

        await this.pony.mint(alice, 10000000, { from: owner });
        assert.equal((await this.pony.balanceOf(alice)).toString(), '10000000');
        assert.equal((await this.pony.balanceOf(this.burnAddress)).toString(), '0');
        assert.equal((await this.pony.balanceOf(this.pony.address)).toString(), '0');

        await this.pony.transfer(bob, 19, { from: alice });
        assert.equal((await this.pony.balanceOf(alice)).toString(), '9999981');
        assert.equal((await this.pony.balanceOf(bob)).toString(), '19');
        assert.equal((await this.pony.balanceOf(this.burnAddress)).toString(), '0');
        assert.equal((await this.pony.balanceOf(this.pony.address)).toString(), '0');
    });

    it('transfer without transfer tax', async () => {
        await this.pony.transferOperator(operator, { from: owner });
        assert.equal((await this.pony.operator()), operator);

        assert.equal((await this.pony.transferTaxRate()).toString(), '500');
        assert.equal((await this.pony.burnRate()).toString(), '20');

        await this.pony.updateTransferTaxRate(0, { from: operator });
        assert.equal((await this.pony.transferTaxRate()).toString(), '0');

        await this.pony.mint(alice, 10000000, { from: owner });
        assert.equal((await this.pony.balanceOf(alice)).toString(), '10000000');
        assert.equal((await this.pony.balanceOf(this.burnAddress)).toString(), '0');
        assert.equal((await this.pony.balanceOf(this.pony.address)).toString(), '0');

        await this.pony.transfer(bob, 10000, { from: alice });
        assert.equal((await this.pony.balanceOf(alice)).toString(), '9990000');
        assert.equal((await this.pony.balanceOf(bob)).toString(), '10000');
        assert.equal((await this.pony.balanceOf(this.burnAddress)).toString(), '0');
        assert.equal((await this.pony.balanceOf(this.pony.address)).toString(), '0');
    });

    it('transfer without burn', async () => {
        await this.pony.transferOperator(operator, { from: owner });
        assert.equal((await this.pony.operator()), operator);

        assert.equal((await this.pony.transferTaxRate()).toString(), '500');
        assert.equal((await this.pony.burnRate()).toString(), '20');

        await this.pony.updateBurnRate(0, { from: operator });
        assert.equal((await this.pony.burnRate()).toString(), '0');

        await this.pony.mint(alice, 10000000, { from: owner });
        assert.equal((await this.pony.balanceOf(alice)).toString(), '10000000');
        assert.equal((await this.pony.balanceOf(this.burnAddress)).toString(), '0');
        assert.equal((await this.pony.balanceOf(this.pony.address)).toString(), '0');

        await this.pony.transfer(bob, 1234, { from: alice });
        assert.equal((await this.pony.balanceOf(alice)).toString(), '9998766');
        assert.equal((await this.pony.balanceOf(bob)).toString(), '1173');
        assert.equal((await this.pony.balanceOf(this.burnAddress)).toString(), '0');
        assert.equal((await this.pony.balanceOf(this.pony.address)).toString(), '61');
    });

    it('transfer all burn', async () => {
        await this.pony.transferOperator(operator, { from: owner });
        assert.equal((await this.pony.operator()), operator);

        assert.equal((await this.pony.transferTaxRate()).toString(), '500');
        assert.equal((await this.pony.burnRate()).toString(), '20');

        await this.pony.updateBurnRate(100, { from: operator });
        assert.equal((await this.pony.burnRate()).toString(), '100');

        await this.pony.mint(alice, 10000000, { from: owner });
        assert.equal((await this.pony.balanceOf(alice)).toString(), '10000000');
        assert.equal((await this.pony.balanceOf(this.burnAddress)).toString(), '0');
        assert.equal((await this.pony.balanceOf(this.pony.address)).toString(), '0');

        await this.pony.transfer(bob, 1234, { from: alice });
        assert.equal((await this.pony.balanceOf(alice)).toString(), '9998766');
        assert.equal((await this.pony.balanceOf(bob)).toString(), '1173');
        assert.equal((await this.pony.balanceOf(this.burnAddress)).toString(), '61');
        assert.equal((await this.pony.balanceOf(this.pony.address)).toString(), '0');
    });

    it('max transfer amount', async () => {
        assert.equal((await this.pony.maxTransferAmountRate()).toString(), '50');
        assert.equal((await this.pony.maxTransferAmount()).toString(), '0');

        await this.pony.mint(alice, 1000000, { from: owner });
        assert.equal((await this.pony.maxTransferAmount()).toString(), '5000');

        await this.pony.mint(alice, 1000, { from: owner });
        assert.equal((await this.pony.maxTransferAmount()).toString(), '5005');

        await this.pony.transferOperator(operator, { from: owner });
        assert.equal((await this.pony.operator()), operator);

        await this.pony.updateMaxTransferAmountRate(100, { from: operator }); // 1%
        assert.equal((await this.pony.maxTransferAmount()).toString(), '10010');
    });

    it('anti whale', async () => {
        await this.pony.transferOperator(operator, { from: owner });
        assert.equal((await this.pony.operator()), operator);

        assert.equal((await this.pony.isExcludedFromAntiWhale(operator)), false);
        await this.pony.setExcludedFromAntiWhale(operator, true, { from: operator });
        assert.equal((await this.pony.isExcludedFromAntiWhale(operator)), true);

        await this.pony.mint(alice, 10000, { from: owner });
        await this.pony.mint(bob, 10000, { from: owner });
        await this.pony.mint(carol, 10000, { from: owner });
        await this.pony.mint(operator, 10000, { from: owner });
        await this.pony.mint(owner, 10000, { from: owner });

        // total supply: 50,000, max transfer amount: 250
        assert.equal((await this.pony.maxTransferAmount()).toString(), '250');
        await expectRevert(this.pony.transfer(bob, 251, { from: alice }), 'PONY::antiWhale: Transfer amount exceeds the maxTransferAmount');
        await this.pony.approve(carol, 251, { from: alice });
        await expectRevert(this.pony.transferFrom(alice, carol, 251, { from: carol }), 'PONY::antiWhale: Transfer amount exceeds the maxTransferAmount');

        //
        await this.pony.transfer(bob, 250, { from: alice });
        await this.pony.transferFrom(alice, carol, 250, { from: carol });

        await this.pony.transfer(this.burnAddress, 251, { from: alice });
        await this.pony.transfer(operator, 251, { from: alice });
        await this.pony.transfer(owner, 251, { from: alice });
        await this.pony.transfer(this.pony.address, 251, { from: alice });

        await this.pony.transfer(alice, 251, { from: operator });
        await this.pony.transfer(alice, 251, { from: owner });
        await this.pony.transfer(owner, 251, { from: operator });
    });

    it('update SwapAndLiquifyEnabled', async () => {
        await expectRevert(this.pony.updateSwapAndLiquifyEnabled(true, { from: operator }), 'operator: caller is not the operator');
        assert.equal((await this.pony.swapAndLiquifyEnabled()), false);

        await this.pony.transferOperator(operator, { from: owner });
        assert.equal((await this.pony.operator()), operator);

        await this.pony.updateSwapAndLiquifyEnabled(true, { from: operator });
        assert.equal((await this.pony.swapAndLiquifyEnabled()), true);
    });

    it('update min amount to liquify', async () => {
        await expectRevert(this.pony.updateMinAmountToLiquify(100, { from: operator }), 'operator: caller is not the operator');
        assert.equal((await this.pony.minAmountToLiquify()).toString(), '500000000000000000000');

        await this.pony.transferOperator(operator, { from: owner });
        assert.equal((await this.pony.operator()), operator);

        await this.pony.updateMinAmountToLiquify(100, { from: operator });
        assert.equal((await this.pony.minAmountToLiquify()).toString(), '100');
    });
});
