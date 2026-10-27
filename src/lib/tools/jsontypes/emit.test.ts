import { describe, expect, it } from 'vitest';
import { DEFAULT_INFER_OPTIONS, inferFromText, type Schema } from './infer';
import { DEFAULT_EMIT_OPTIONS, emit, type EmitOptions, type LanguageId } from './emit';
import { SAMPLE } from './sample';

function schemaOf(text: string): Schema {
	const result = inferFromText(text, DEFAULT_INFER_OPTIONS);
	if (!result.ok) {
		throw new Error('invalid sample');
	}
	return result.schema;
}

const sample = schemaOf(SAMPLE);

function run(language: LanguageId, options: Partial<EmitOptions> = {}): string {
	return emit(language, sample, { ...DEFAULT_EMIT_OPTIONS, ...options });
}

describe('emitters on a nontrivial sample', () => {
	it('typescript', () => {
		expect(run('typescript')).toBe(`export interface Root {
  id: number;
  "user-name": string;
  score: number;
  note: unknown;
  address: Address;
  items: Item[];
  tags: string[];
}

export interface Address {
  city: string;
  zip: string;
}

export interface Item {
  sku: string;
  qty: number;
  label: string | null;
  price?: number;
}
`);
	});

	it('go', () => {
		expect(run('go')).toBe(`type Root struct {
	ID       int64       \`json:"id"\`
	UserName string      \`json:"user-name"\`
	Score    float64     \`json:"score"\`
	Note     interface{} \`json:"note"\`
	Address  Address     \`json:"address"\`
	Items    []Item      \`json:"items"\`
	Tags     []string    \`json:"tags"\`
}

type Address struct {
	City string \`json:"city"\`
	Zip  string \`json:"zip"\`
}

type Item struct {
	Sku   string   \`json:"sku"\`
	Qty   int64    \`json:"qty"\`
	Label *string  \`json:"label"\`
	Price *float64 \`json:"price,omitempty"\`
}
`);
	});

	it('rust', () => {
		expect(run('rust')).toBe(`use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Root {
    pub id: i64,
    #[serde(rename = "user-name")]
    pub user_name: String,
    pub score: f64,
    pub note: serde_json::Value,
    pub address: Address,
    pub items: Vec<Item>,
    pub tags: Vec<String>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Address {
    pub city: String,
    pub zip: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Item {
    pub sku: String,
    pub qty: i64,
    pub label: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub price: Option<f64>,
}
`);
	});

	it('python', () => {
		expect(run('python')).toBe(`from dataclasses import dataclass
from typing import Any, Optional


@dataclass
class Address:
    city: str
    zip: str


@dataclass
class Item:
    sku: str
    qty: int
    label: Optional[str]
    price: Optional[float] = None


@dataclass
class Root:
    id: int
    user_name: str  # JSON key: "user-name"
    score: float
    note: Any
    address: Address
    items: list[Item]
    tags: list[str]
`);
	});

	it('dart', () => {
		expect(run('dart')).toBe(`class Root {
  final int id;
  final String userName;
  final double score;
  final dynamic note;
  final Address address;
  final List<Item> items;
  final List<String> tags;

  const Root({
    required this.id,
    required this.userName,
    required this.score,
    required this.note,
    required this.address,
    required this.items,
    required this.tags,
  });

  factory Root.fromJson(Map<String, dynamic> json) {
    return Root(
      id: json['id'] as int,
      userName: json['user-name'] as String,
      score: (json['score'] as num).toDouble(),
      note: json['note'],
      address: Address.fromJson(json['address'] as Map<String, dynamic>),
      items: (json['items'] as List<dynamic>).map((e) => Item.fromJson(e as Map<String, dynamic>)).toList(),
      tags: (json['tags'] as List<dynamic>).map((e) => e as String).toList(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'user-name': userName,
      'score': score,
      'note': note,
      'address': address.toJson(),
      'items': items.map((e) => e.toJson()).toList(),
      'tags': tags,
    };
  }
}

class Address {
  final String city;
  final String zip;

  const Address({
    required this.city,
    required this.zip,
  });

  factory Address.fromJson(Map<String, dynamic> json) {
    return Address(
      city: json['city'] as String,
      zip: json['zip'] as String,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'city': city,
      'zip': zip,
    };
  }
}

class Item {
  final String sku;
  final int qty;
  final String? label;
  final double? price;

  const Item({
    required this.sku,
    required this.qty,
    required this.label,
    this.price,
  });

  factory Item.fromJson(Map<String, dynamic> json) {
    return Item(
      sku: json['sku'] as String,
      qty: json['qty'] as int,
      label: json['label'] as String?,
      price: (json['price'] as num?)?.toDouble(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'sku': sku,
      'qty': qty,
      'label': label,
      if (price != null) 'price': price,
    };
  }
}
`);
	});

	it('kotlin', () => {
		expect(run('kotlin')).toBe(`import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonElement

@Serializable
data class Root(
    val id: Long,
    @SerialName("user-name") val userName: String,
    val score: Double,
    val note: JsonElement,
    val address: Address,
    val items: List<Item>,
    val tags: List<String>
)

@Serializable
data class Address(
    val city: String,
    val zip: String
)

@Serializable
data class Item(
    val sku: String,
    val qty: Long,
    val label: String? = null,
    val price: Double? = null
)
`);
	});

	it('swift', () => {
		expect(run('swift')).toBe(`import Foundation

struct Root: Codable {
    let id: Int
    let userName: String
    let score: Double
    let note: JSONValue
    let address: Address
    let items: [Item]
    let tags: [String]

    enum CodingKeys: String, CodingKey {
        case id
        case userName = "user-name"
        case score
        case note
        case address
        case items
        case tags
    }
}

struct Address: Codable {
    let city: String
    let zip: String
}

struct Item: Codable {
    let sku: String
    let qty: Int
    let label: String?
    let price: Double?
}

enum JSONValue: Codable {
    case string(String)
    case number(Double)
    case bool(Bool)
    case array([JSONValue])
    case object([String: JSONValue])
    case null

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if container.decodeNil() {
            self = .null
        } else if let value = try? container.decode(Bool.self) {
            self = .bool(value)
        } else if let value = try? container.decode(Double.self) {
            self = .number(value)
        } else if let value = try? container.decode(String.self) {
            self = .string(value)
        } else if let value = try? container.decode([JSONValue].self) {
            self = .array(value)
        } else {
            self = .object(try container.decode([String: JSONValue].self))
        }
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        switch self {
        case .string(let value): try container.encode(value)
        case .number(let value): try container.encode(value)
        case .bool(let value): try container.encode(value)
        case .array(let value): try container.encode(value)
        case .object(let value): try container.encode(value)
        case .null: try container.encodeNil()
        }
    }
}
`);
	});

	it('csharp', () => {
		expect(run('csharp')).toBe(`#nullable enable
using System.Collections.Generic;
using System.Text.Json.Serialization;

public class Root
{
    [JsonPropertyName("id")]
    public long Id { get; set; }

    [JsonPropertyName("user-name")]
    public string UserName { get; set; } = string.Empty;

    [JsonPropertyName("score")]
    public double Score { get; set; }

    [JsonPropertyName("note")]
    public object? Note { get; set; }

    [JsonPropertyName("address")]
    public Address Address { get; set; } = new();

    [JsonPropertyName("items")]
    public List<Item> Items { get; set; } = new();

    [JsonPropertyName("tags")]
    public List<string> Tags { get; set; } = new();
}

public class Address
{
    [JsonPropertyName("city")]
    public string City { get; set; } = string.Empty;

    [JsonPropertyName("zip")]
    public string Zip { get; set; } = string.Empty;
}

public class Item
{
    [JsonPropertyName("sku")]
    public string Sku { get; set; } = string.Empty;

    [JsonPropertyName("qty")]
    public long Qty { get; set; }

    [JsonPropertyName("label")]
    public string? Label { get; set; }

    [JsonPropertyName("price")]
    public double? Price { get; set; }
}
`);
	});

	it('java', () => {
		expect(run('java')).toBe(`import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

public record Root(
    long id,
    @JsonProperty("user-name") String userName,
    double score,
    Object note,
    Address address,
    List<Item> items,
    List<String> tags
) {}

record Address(
    String city,
    String zip
) {}

record Item(
    String sku,
    long qty,
    String label,
    Double price
) {}
`);
	});

	it('zod', () => {
		expect(run('zod')).toBe(`import { z } from "zod";

export const AddressSchema = z.object({
  city: z.string(),
  zip: z.string(),
});
export type Address = z.infer<typeof AddressSchema>;

export const ItemSchema = z.object({
  sku: z.string(),
  qty: z.number().int(),
  label: z.string().nullable(),
  price: z.number().optional(),
});
export type Item = z.infer<typeof ItemSchema>;

export const RootSchema = z.object({
  id: z.number().int(),
  "user-name": z.string(),
  score: z.number(),
  note: z.unknown(),
  address: AddressSchema,
  items: z.array(ItemSchema),
  tags: z.array(z.string()),
});
export type Root = z.infer<typeof RootSchema>;
`);
	});

	it('jsonschema', () => {
		expect(run('jsonschema')).toBe(`{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Root",
  "type": "object",
  "properties": {
    "id": {
      "type": "integer"
    },
    "user-name": {
      "type": "string"
    },
    "score": {
      "type": "number"
    },
    "note": {},
    "address": {
      "$ref": "#/$defs/Address"
    },
    "items": {
      "type": "array",
      "items": {
        "$ref": "#/$defs/Item"
      }
    },
    "tags": {
      "type": "array",
      "items": {
        "type": "string"
      }
    }
  },
  "required": [
    "id",
    "user-name",
    "score",
    "note",
    "address",
    "items",
    "tags"
  ],
  "$defs": {
    "Address": {
      "type": "object",
      "properties": {
        "city": {
          "type": "string"
        },
        "zip": {
          "type": "string"
        }
      },
      "required": [
        "city",
        "zip"
      ]
    },
    "Item": {
      "type": "object",
      "properties": {
        "sku": {
          "type": "string"
        },
        "qty": {
          "type": "integer"
        },
        "label": {
          "type": [
            "string",
            "null"
          ]
        },
        "price": {
          "type": "number"
        }
      },
      "required": [
        "sku",
        "qty",
        "label"
      ]
    }
  }
}
`);
	});

	it('python (pydantic)', () => {
		expect(run('python', { pythonStyle: 'pydantic' })).toBe(`from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, Field


class Address(BaseModel):
    city: str
    zip: str


class Item(BaseModel):
    sku: str
    qty: int
    label: Optional[str]
    price: Optional[float] = None


class Root(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: int
    user_name: str = Field(alias="user-name")
    score: float
    note: Any
    address: Address
    items: list[Item]
    tags: list[str]
`);
	});
});
