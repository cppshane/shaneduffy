using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

using shaneduffy.Models;
using shaneduffy.Services;

namespace shaneduffy
{
    public class Startup
    {
        public Startup(IConfiguration configuration)
        {
            Configuration = configuration;
        }

        public IConfiguration Configuration { get; }

        public void ConfigureServices(IServiceCollection services)
        {
            services.Configure<ShaneDuffyDatabaseSettings>(
            Configuration.GetSection(nameof(ShaneDuffyDatabaseSettings)));

            services.AddSingleton<IShaneDuffyDatabaseSettings>(sp =>
                sp.GetRequiredService<IOptions<ShaneDuffyDatabaseSettings>>().Value);

            services.AddSingleton<PostService>();

            services.AddControllers()
                .AddNewtonsoftJson(options => {
                    options.UseMemberCasing();
                });
        }

        public void Configure(IApplicationBuilder app, IWebHostEnvironment env)
        {
            app.UseRouting();

            app.UseEndpoints(endpoints =>
            {
                endpoints.MapControllers();
            });
            }
    }
}   