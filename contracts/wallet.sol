pragma solidity >=0.8.0 < 0.9.0;


import "../node_modules/@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../node_modules/@openzeppelin/contracts/utils/math/safeMath.sol";
import "../node_modules/@openzeppelin/contracts/access/Ownable.sol";

contract Wallet is Ownable {
    using SafeMath for uint256;

    struct Token{
        bytes32 ticker;
        address tokenAddress;
    }
    mapping(bytes32 => Token ) public tokenMapping;
    bytes32[] public tokenList;

    mapping( address => mapping(bytes32 => uint256)) public balances;

    modifier tokenExist(bytes32 ticker) {
        require(tokenMapping[ticker].tokenAddress != address(0), "Does not exist " );
        _;
    }

    function addToken(bytes32 ticker, address tokenAddress)  external onlyOwner {
        tokenMapping[ticker] = Token(ticker, tokenAddress);
        tokenList.push(ticker);
    }

    function deposit( uint amount, bytes32 ticker)external tokenExist(ticker) {
        balances[msg.sender][ticker] = balances[msg.sender][ticker].add(amount);
        IERC20(tokenMapping[ticker].tokenAddress).transferFrom(msg.sender, address(this), amount);
    }

    function depositEth() payable external{
        balances[msg.sender][bytes32("ETH")] = balances[msg.sender][bytes32("ETH")].add(msg.value);
    }

    function withrawal( uint amount, bytes32 ticker)external tokenExist(ticker) {
        require(balances[msg.sender][ticker] >= amount, "balance not sufficient");
        balances[msg.sender][ticker] = balances[msg.sender][ticker].sub(amount);
        IERC20(tokenMapping[ticker].tokenAddress).transfer(msg.sender, amount);

    }

}