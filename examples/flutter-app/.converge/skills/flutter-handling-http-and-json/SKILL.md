---
name: flutter-handling-http-and-json
description: Executes HTTP requests and handles JSON serialization in a Flutter app. Use when integrating with REST APIs or parsing structured data from external sources.
---
# Handling HTTP and JSON

## Contents
- [Core Guidelines](#core-guidelines)
- [Workflow: Executing HTTP Operations](#workflow-executing-http-operations)
- [Workflow: Implementing JSON Serialization](#workflow-implementing-json-serialization)
- [Examples](#examples)

## Core Guidelines

- **Enforce HTTPS:** iOS and Android disable cleartext (HTTP) connections by default. Always use HTTPS endpoints.
- **Construct URIs Safely:** Always use `Uri.https(authority, unencodedPath, [queryParameters])` to build URLs safely.
- **Handle Status Codes:** Always validate `http.Response.statusCode`. Treat `200` and `201` as success. Throw explicit exceptions for other codes.
- **Prevent UI Jank:** Move expensive JSON parsing (>16ms) to a background isolate using `compute()`.

## Workflow: Executing HTTP Operations

- [ ] Add the `http` package to `pubspec.yaml`.
- [ ] Configure platform permissions (Internet permission in `AndroidManifest.xml`).
- [ ] Construct the target `Uri`.
- [ ] Execute the HTTP method (`http.get`, `http.post`, `http.put`, `http.delete`).
- [ ] Validate the response and parse JSON payload.

## Workflow: Implementing JSON Serialization

**Small prototype / simple models:** Use manual serialization with `dart:convert`.
- [ ] Define Model class with `final` properties.
- [ ] Implement `factory Model.fromJson(Map<String, dynamic> json)`.
- [ ] Implement `Map<String, dynamic> toJson()`.

**Production app / complex models:** Use code generation with `json_serializable` or `freezed`.
- [ ] Add `json_annotation` and `json_serializable` (or `freezed`) dependencies.
- [ ] Add `part 'model_name.g.dart';` directive.
- [ ] Annotate class with `@JsonSerializable()` or `@freezed`.
- [ ] Run `dart run build_runner build --delete-conflicting-outputs`.

## Examples

### HTTP GET with Manual Serialization

```dart
import 'dart:convert';
import 'package:http/http.dart' as http;

class Album {
  final int id;
  final String title;

  const Album({required this.id, required this.title});

  factory Album.fromJson(Map<String, dynamic> json) {
    return Album(
      id: json['id'] as int,
      title: json['title'] as String,
    );
  }
}

Future<Album> fetchAlbum() async {
  final uri = Uri.https('jsonplaceholder.typicode.com', '/albums/1');
  final response = await http.get(uri);

  if (response.statusCode == 200) {
    return Album.fromJson(jsonDecode(response.body) as Map<String, dynamic>);
  } else {
    throw Exception('Failed to load album');
  }
}
```

### Background Parsing with `compute`

```dart
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;

List<Photo> parsePhotos(String responseBody) {
  final parsed = (jsonDecode(responseBody) as List).cast<Map<String, Object?>>();
  return parsed.map<Photo>(Photo.fromJson).toList();
}

Future<List<Photo>> fetchPhotos(http.Client client) async {
  final uri = Uri.https('jsonplaceholder.typicode.com', '/photos');
  final response = await client.get(uri);

  if (response.statusCode == 200) {
    return compute(parsePhotos, response.body);
  } else {
    throw Exception('Failed to load photos');
  }
}
```
