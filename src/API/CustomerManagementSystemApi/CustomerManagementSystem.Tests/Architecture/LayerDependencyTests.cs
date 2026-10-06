using System.Reflection;
using CustomerManagementSystem.BusinessLogic;
using CustomerManagementSystem.DataAccess;
using CustomerManagementSystem.Domain.Models;
using CustomerManagementSystem.WebAPI.Controllers;
using NetArchTest.Rules;

namespace CustomerManagementSystem.Tests.Architecture;

// Dependencies point inward: Domain ← BusinessLogic ← DataAccess, with WebAPI composing them.
public class LayerDependencyTests
{
    private static readonly Assembly Domain = typeof(CustomerModel).Assembly;
    private static readonly Assembly BusinessLogic = typeof(BusinessLogicDependencyInjection).Assembly;
    private static readonly Assembly DataAccess = typeof(DataAccessDependencyInjection).Assembly;
    private static readonly Assembly WebApi = typeof(ApiControllerBase).Assembly;

    private static void AssertNoDependency(Assembly assembly, params string[] forbidden)
    {
        var result = Types.InAssembly(assembly)
            .ShouldNot()
            .HaveDependencyOnAny(forbidden)
            .GetResult();

        Assert.True(result.IsSuccessful, string.Join(", ", result.FailingTypeNames ?? []));
    }

    [Fact]
    public void Domain_Should_Not_Reference_AnyOtherLayer_OrFramework() =>
        AssertNoDependency(Domain,
            "CustomerManagementSystem.BusinessLogic",
            "CustomerManagementSystem.DataAccess",
            "CustomerManagementSystem.WebAPI",
            "Microsoft.AspNetCore",
            "Microsoft.Data.SqlClient");

    [Fact]
    public void BusinessLogic_Should_Not_Reference_DataAccess_WebApi_AspNetCore_OrSqlClient() =>
        AssertNoDependency(BusinessLogic,
            "CustomerManagementSystem.DataAccess",
            "CustomerManagementSystem.WebAPI",
            "Microsoft.AspNetCore",
            "Microsoft.Data.SqlClient");

    [Fact]
    public void DataAccess_Should_Not_Reference_WebApi_OrAspNetCore() =>
        AssertNoDependency(DataAccess,
            "CustomerManagementSystem.WebAPI",
            "Microsoft.AspNetCore");

    [Fact]
    public void Controllers_Should_Not_Reference_DataAccess_OrSqlClient()
    {
        var result = Types.InAssembly(WebApi)
            .That()
            .ResideInNamespace("CustomerManagementSystem.WebAPI.Controllers")
            .ShouldNot()
            .HaveDependencyOnAny("CustomerManagementSystem.DataAccess", "Microsoft.Data.SqlClient")
            .GetResult();

        Assert.True(result.IsSuccessful, string.Join(", ", result.FailingTypeNames ?? []));
    }
}
