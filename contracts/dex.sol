pragma solidity >=0.8.0 < 0.9.0;
//pragma experimental ABIencoderV2;

import "./wallet.sol";


contract Dex is Wallet { 
    enum Side {
        BUY,
        SELL
    }
    struct Order {
        uint id;
        address trader;
        Side side;
        bytes32 ticker;
        uint amount;
        uint price;
        uint filled;
    }

    uint public nextOrderId = 0;
    mapping(bytes32 => mapping(uint => Order[])) public orderBook;

    function getOrderBook(bytes32 ticker, Side side) view public returns( Order[] memory){
        return orderBook[ticker][uint(side)];

    }
    function createLimitOrder( Side side, bytes32 ticker, uint amount, uint price) public{
        if(side == Side.BUY){
            require(balances[msg.sender]["ETH"] >= amount * price);

        }
        else if (side == Side.SELL){
            require(balances[msg.sender][ticker] >= amount);
        }

        Order[] storage orders = orderBook[ticker][uint(side)];
        orders.push(
            Order(nextOrderId, msg.sender, side, ticker, amount, price, 0)
        );

        //Bubble sort
        uint i = orders.length > 0 ? orders.length -1 : 0 ;
        if(side == Side.BUY){
            while(i > 0){
                if(orders[i-1].price > orders[i].price) {
                    break;
                }
                Order memory orderToMove = orders[i-1] ;
                orders[i-1] = orders[i];
                orders[i] = orderToMove;
                i--;
            }

        }
        else if(side == Side.SELL){
            while(i > 0){
                if (orders[i-1].price < orders[i].price) {
                    break;
                }
                Order memory orderToMove = orders[i-1];
                orders[i-1] = orders[i];
                orders[i]= orderToMove;
                i--;
            }
        }
        nextOrderId++;
    }

    function createMarketOrder(Side side, bytes32 ticker, uint amount) public{
        if(side == Side.SELL){
            require(balances[msg.sender][ticker] >= amount, "Insuffient balance");
        }

        uint orderBookSide;
        if(side == Side.BUY){
            orderBookSide = 1;
        }
        else{
            orderBookSide = 0;
        }
        Order[] storage orders = orderBook[ticker][orderBookSide];

        uint totalFilled = 0;

        for( uint256 i= 0; i< orders.length && totalFilled < amount; i++ ) {
            uint leftToFill = amount - totalFilled;
            uint avaibleToFill = orders[i].amount - orders[i].filled; 
            uint filled = 0;
            if( avaibleToFill > leftToFill) {
                filled = leftToFill; 
            }
            else {
                filled = avaibleToFill;
            }

            totalFilled = totalFilled + filled;
            orders[i].filled = orders[i].filled + filled;
            uint cost = filled * orders[i].price;

            if(side == Side.BUY){
                //Verify that the buyer has enough ETH to cover the ûrchase (require)
                require(balances[msg.sender]["ETH"] >= filled * orders[i].price);
                 //msg.sender is the buyer
                balances[msg.sender][ticker] = balances[msg.sender][ticker] + filled;
                balances[msg.sender]["ETH"] = balances[msg.sender]["ETH"] - cost;

                balances[orders[i].trader][ticker] = balances[orders[i].trader][ticker] - filled;
                balances[orders[i].trader]["ETH"] = balances[orders[i].trader]["ETH"] + cost;
               
                //transfer eth from buyer to seller
                //Transfer Tokens from Seller to Buyer
            }
            else if (side == Side.SELL){ //Execute the tade and shift balances between buyer and seller
                //msg.sender is the seller
                balances[msg.sender][ticker] = balances[msg.sender][ticker] - filled;
                balances[msg.sender]["ETH"] = balances[msg.sender]["ETH"] + cost;

                balances[orders[i].trader][ticker] = balances[orders[i].trader][ticker] + filled;
                balances[orders[i].trader]["ETH"] = balances[orders[i].trader]["ETH"] - cost;
                //transfer eth from buyer to seller
                //Transfer Tokens from Seller to Buyer     
            }
        
        }
        // loop trough the orderbook and remove 100% filled orders
        while ( orders[0].filled == orders[0].amount && orders.length > 0){
            for (uint256 i = 0; i < orders.length - 1; i ++ ){
                orders[i]= orders[i + 1];
            }
            orders.pop();

        }
                

    }


}