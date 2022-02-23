//when creating a sell marlet order, the seller needs to have enough tokens for the trade.
//When creating a buy markety order, the buyer needs to have enough eth for the trade
//Market orders can be submitted even if the order book is empty
//Market orders should be filled until the order book is empty or the market order is 100% filled.
//The Eth balances of the buyer should decrease with the filled amount
//The token balances of the sellers should decrease with the filled amounts.
//Filled limit orders should be removed from the orderbook
const Dex = artifacts.require("Dex")
const Link = artifacts.require("Link")
const truffleAssert = require('truffle-assertions');

contract("market orders", accounts => { 
    it (" sellers should have enough tokens to place the trade ", async() => {
        let dex = dex.deployed()
        let balance = await dex.balances(accounts[0], web3.utils.fromUtf8("LINK"))
        assert.equal( balance.toNumber(), 0, "Initial LINK balance is not 0" );
        
        await truffleAssert.reverts(
            dex.createMarketOrder(1, web3.utils.fromUtf8("LINK"), 10)
        )

    })
    it (" Buyers should have enough ETH to place the trade ", async() => {
        let dex = await Dex.deployed()
        
        await dex.depositEth({value: 50000});

        let orderbook = await dex.getOrderBook(web3.utils.fromUtf8("LINK"), 0); //Get buy side orderbook
        assert(orderbook.length == 0, "Buy side Orderbook length is not 0");
        
        await truffleAssert.passes(
            dex.createMarketOrder(0, web3.utils.fromUtf8("LINK"), 10)
        )

    })
    it (" if orderbook is empty, still can submit order", async() => {
        let dex = await Dex.deployed()
        
        await dex.depositEth({value: 50000});

        let orderbook = await dex.getOrderBook(web3.utils.fromUtf8("LINK"), 0); //Get buy side orderbook
        assert(orderbook.length == 0, "Buy side Orderbook length is not 0");
        
        await truffleAssert.passes(
            dex.createMarketOrder(0, web3.utils.fromUtf8("LINK"), 10)
        )

    })
    it (" Market orders should be filled until the order book is empty or the market order is 100% filled.", async() => {
        let dex = await Dex.deployed()
        let link = await Link.deployed()

        let orderbook = await dex.getOrderBook(web3.utils.fromUtf8("LINK"), 1); //Get sell side orderbook
        assert(orderbook.length == 0, "Sell side Orderbook should be empty at start of test");

        await dex.addToken(web3.utils.fromUtf8("LINK"), link.address)


        //Send LINK tokens to accounts 1, 2, 3 from account 0
        await link.transfer(accounts[1], 150)
        await link.transfer(accounts[2], 150)
        await link.transfer(accounts[3], 150)

        //Approve DEX for accounts 1, 2, 3
        await link.approve(dex.address, 50, {from: accounts[1]});
        await link.approve(dex.address, 50, {from: accounts[2]});
        await link.approve(dex.address, 50, {from: accounts[3]});

        //Deposit LINK into DEX for accounts 1, 2, 3
        await dex.deposit(50, web3.utils.fromUtf8("LINK"), {from: accounts[1]});
        await dex.deposit(50, web3.utils.fromUtf8("LINK"), {from: accounts[2]});
        await dex.deposit(50, web3.utils.fromUtf8("LINK"), {from: accounts[3]});

        //Fill up the sell order book
        await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 5, 300, {from: accounts[1]})
        await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 5, 400, {from: accounts[2]})
        await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 5, 500, {from: accounts[3]})

        //Create market order that should fill 2/3 orders in the book
        await dex.createMarketOrder(0, web3.utils.fromUtf8("LINK"), 10);

        orderbook = await dex.getOrderBook(web3.utils.fromUtf8("LINK"), 1); //Get sell side orderbook
        assert(orderbook.length == 1, "Sell side Orderbook should only have 1 order left");
        assert(orderbook[0].filled == 0, "Sell side order should have 0 filled");

    })
    it (" The Eth balances of the buyer should decrease with the filled amount.", async() => {
        let dex = await Dex.deployed()
        let link = await link.deployed()

        //Seller deposits link and creates a sell limit order for 1 link for 300 weir
        await link.approve(dex.address, 500, ({from: accounts[1]}));
        await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 1, 300, {from: accounts[1]});

        //Check buyer ETH balance before trad
        let balanceBefore = await dex.balances(accounts[0], web3.utils.fromUtf8("ETH"));
        await dex.createMarketOrder(0, web3.utils.fromUtf8("LINK"),1);
        let balanceAfter = await dex.balances(accounts[0], web3.utils.fromUtf8("ETH"));

        assert.equal(balanceBefore.toNumber()- 300, balanceAfter.toNumber());

    })
    it (" The token balances of the limit order sellers should decrease with the filled amounts.", async() => {
       let dex = await Dex.deployed()
       let link = await Link.deployed()
       
       let orderbook = await dex.getOrderBook(web3.utils.fromUtf8("LINK"),1); // get sell side orderbook
       assert(orderbook.length == 0, "Sell side Orderbook should be empty at start of test");

       //Seller Account[2] deposit Link
       await link.approve(dex.address,500, {from:accounts[2]});
       await dex.deposit(100, web3.utils.fromUtf8("LINK"), {from: accounts[2]});

       await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 1, 300, {from: accounts[1]})
       await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 1, 400, {from: accounts[2]})

       //Check seller link balance before trade

       let account1balanceBefore = await dex.balances(accounts[1], web3.utils.fromUtf8("LINK"));
       let account2balanceBefore = await dex.balances(accounts[2], web3.utils.fromUtf8("LINK"));

       //Account[0] created market order to buy up both sell orders

       await dex.createMarketOrder(0,web3.utils.fromUtf8("LINK"),2 );

       //Check sellers link balances after trade
       let account1balanceAfter = await dex.balances(accounts[1], web3.utils.fromUtf8("LINK"));
       let account2balanceAfter = await dex.balances(accounts[2], web3.utils.fromUtf8("LINK"));

       assert.equal(account1balanceBefore.toNumber() - 1, account1balanceAfter.toNumber());
       assert.equal(account2balanceBefore.toNumber() - 1, account2balanceAfter.toNumber());

    })
    it (" Filled limit orders should be removed from the orderbook ", async() => {
        let dex = await Dex.deployed()
        let link = await Link.deployed()
        await dex.addToken(web3.utils.fromUtf8("LINK"), link.address)

        //Seller deposits link and creates a sell limit order for 1 link for 300 wei
        await link.approve(dex.address, 500);
        await dex.deposit(50, web3.utils.fromUtf8("LINK"));

        await dex.depositEth({value: 10000});

        let orderbook = await dex.getOrderbooke(web3.utils.fromUtf8("LINK"), 1); //Get sell side orderbook

        await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 1, 300)
        await dex.createMarketOrder(0, web3.utils.fromUtf8("LINK"), 1);

        orderbook = await dex.getOrderBook(web3.utils.fromUtf8("LINK"), 1); //Get sell side orderbook
        assert(orderbook.length == 0, "Sell side orderbook should be empty after trade");

    })
    // Partly filled limit orders should be modified to represent the filled/remaining amaount
    it("Limit orders filled proprety should be set correctly after a trade", async() => {
        let dex = await Dex.deployed()

        let orderbook = await dex.getOrderBook(web3.utils.fromUtf8("LINK"), 1);
        assert(orderbook.length == 0, "Sell side orderbook should be empty at start of test");

        await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 5, 300, {from: accounts[1]})
        await dex.createMarketOrder(0, web3.utils.fromUtf8("LINK"), 2);

        orderbopok = await dex.getOrderBook(web3.utils.fromUtf8("LINK"), 1); //Get sell side orderbook
        assert.equal(orderbook[0].filled, 2);
        assert.equal(orderbook[0].amount, 5);
    })
    //When creating a BUY market order, the buyer needs to have enougfh ETH for the trade
    it("Should throw an error when creating a buy market order without adequate ETH balance", async() => {
        let dex = await Dex.deployed()

        let balance = await dex.balances(accounts[4], web3.utils.fromUtf8("ETH"))
        assert.equal(balance.toNumber(),0, "Initial ETH balance is not 0");
        await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 5, 300, {from: accounts[1]})

        await truffleAssert.reverts(
            dex.createMarketOrder(0, web3.utils.fromUtf8("LINK"), 5, {from: accounts[4]})
        )
    })
    
})