using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace shaneduffy.Models
{
    public class ShaneDuffyDatabaseSettings : IShaneDuffyDatabaseSettings
    {
        public string BlogPostsCollectionName { get; set; }
        public string ConnectionString { get; set; }
        public string DatabaseName { get; set; }
    }

    public interface IShaneDuffyDatabaseSettings
    {
        string BlogPostsCollectionName { get; set; }
        string ConnectionString { get; set; }
        string DatabaseName { get; set; }
    }
}
