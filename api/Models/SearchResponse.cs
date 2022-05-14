using System.Collections.Generic;

namespace shaneduffy.Models {
    public class SearchResponse {
        public int TotalPages { get; set; }
        public int CurrentPage { get; set; }
        public List<Post> Posts { get; set; }
    }
}