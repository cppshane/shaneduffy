﻿using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using System;
using System.Collections.Generic;

namespace shaneduffy.Models
{
    public class Post
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string Id { get; set; }
        [BsonElement("uri")]
        public string Uri { get; set; }
        [BsonElement("sub_id")]
        public int SubId { get; set; }
        [BsonElement("title")]
        public string Title { get; set; }
        [BsonElement("type")]
        public string Type { get; set; }
        [BsonElement("image")]
        public string Image { get; set; }
        [BsonElement("preview")]
        public string Preview { get; set; }
        [BsonElement("content")]
        public string Content { get; set; }
        [BsonElement("date")]
        public DateTime Date { get; set; }
        [BsonElement("keywords")]
        public List<string> Keywords { get; set; }
    }
}