using CustomerManagementSystem.Domain.Models;
using NetArchTest.Rules;

namespace CustomerManagementSystem.Tests.Architecture;

public class LayerDependencyTests
{
    [Fact]
    public void Domain_Should_Not_Reference_DataAccess()
    {
        var result = Types.InAssembly(typeof(ResponseModel<>).Assembly)
            .ShouldNot()
            .HaveDependencyOn("CustomerManagementSystem.DataAccess")
            .GetResult();

        Assert.True(result.IsSuccessful, string.Join(", ", result.FailingTypeNames ?? []));
    }
}
