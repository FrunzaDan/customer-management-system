using CustomerManagementSystem.BusinessLogic.Abstractions;
using CustomerManagementSystem.BusinessLogic.Contracts;
using CustomerManagementSystem.BusinessLogic.Features.Customers;
using CustomerManagementSystem.Domain.Models;
using Moq;

namespace CustomerManagementSystem.Tests.Features.Customers;

public class GetCustomerInsightsHandlerTests
{
    [Fact]
    public async Task GetCustomerInsightsAsync_ReturnsWhateverTheDbLayerReturns()
    {
        var customers = new Mock<ICustomerRepository>();
        var expected = new ResponseModel<CustomerInsightsModel>(200, "Customer insights retrieved.",
            new CustomerInsightsModel { Customers = [], MonthlySales = [] });
        customers.Setup(d => d.GetCustomerInsightsAsync(It.IsAny<CancellationToken>())).ReturnsAsync(expected);
        var handler = new GetCustomerInsightsHandler(customers.Object);

        var result = await handler.HandleAsync(TestContext.Current.CancellationToken);

        Assert.Same(expected, result);
    }
}
