pragma solidity ^0.4.25;
import 'remix_tests.sol';

contract MyTest {
  uint i = 0;

  function beforeAll() {
    i += 1;
  }

  function valueShouldBe1() public {
    Assert.equal(1, i, "value is not correct");
  }
}
