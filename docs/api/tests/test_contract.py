"""Static checks complement OpenAPI validation and live backend contract tests."""
import pathlib
import re
import unittest
import yaml

ROOT = pathlib.Path(__file__).resolve().parents[3]
HTTP_METHODS = {'get', 'post', 'put', 'patch', 'delete', 'head', 'options'}


class ContractTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.doc = yaml.safe_load((ROOT / 'docs/api/openapi.yaml').read_text())

    def operations(self):
        for path, item in self.doc['paths'].items():
            for method, operation in item.items():
                if method in HTTP_METHODS:
                    yield path, method, operation

    def test_every_operation_has_unique_id_permission_and_typed_success(self):
        ids = set()
        for path, method, op in self.operations():
            with self.subTest(path=path, method=method):
                self.assertTrue(op.get('summary'))
                operation_id = op.get('operationId')
                self.assertTrue(operation_id)
                self.assertNotIn(operation_id, ids)
                ids.add(operation_id)
                self.assertIn('x-permission', op)
                self.assertIn(op.get('x-implementation-status'), ['PLANNED', 'IMPLEMENTED'])
                successes = {code: r for code, r in op['responses'].items() if str(code).startswith('2')}
                self.assertTrue(successes)
                for code, response in successes.items():
                    if str(code) != '204':
                        self.assertIn('schema', response['content']['application/json'])

    def test_list_envelopes_match_backend_offset_pagination(self):
        for name in ['UserListResponse', 'ClubListResponse', 'DepartmentListResponse', 'MembershipListResponse', 'DepartmentMemberListResponse']:
            with self.subTest(name=name):
                properties = self.doc['components']['schemas'][name]['properties']
                self.assertEqual(set(properties), {'items', 'total', 'offset', 'limit'})
                self.assertIn('$ref', properties['items']['items'])

    def test_openapi_31_does_not_use_nullable_keyword(self):
        def visit(node):
            if isinstance(node, dict):
                self.assertNotIn('nullable', node, 'OpenAPI 3.1 uses union types with null')
                for value in node.values(): visit(value)
            elif isinstance(node, list):
                for value in node: visit(value)
        visit(self.doc)

    def test_all_local_references_resolve(self):
        def visit(node):
            if isinstance(node, dict):
                if '$ref' in node:
                    ref = node['$ref']
                    self.assertTrue(ref.startswith('#/'))
                    value = self.doc
                    for part in ref[2:].split('/'):
                        value = value[part.replace('~1', '/').replace('~0', '~')]
                for value in node.values(): visit(value)
            elif isinstance(node, list):
                for value in node: visit(value)
        visit(self.doc)

    def test_each_protected_operation_documents_401_and_403(self):
        for path, method, op in self.operations():
            if op.get('security', self.doc['security']):
                with self.subTest(path=path, method=method):
                    self.assertIn('401', op['responses'])
                    self.assertIn('403', op['responses'])

    def test_post_creation_and_delete_status_codes(self):
        for path, method, op in self.operations():
            with self.subTest(path=path, method=method):
                if method == 'post' and '/auth/' not in path and not path.endswith('/approve') and not path.endswith('/reject'):
                    self.assertIn('201', op['responses'])
                if method == 'delete':
                    self.assertIn('204', op['responses'])


    def test_contract_paths_match_catalog_inventory(self):
        catalog = yaml.safe_load((ROOT / 'docs/api/catalog.yml').read_text())['entries']
        catalog_paths = {(e['method'].lower(), e['path'].replace('/api/v1', '', 1)) for e in catalog}
        contract_paths = {(method, path) for path, method, _ in self.operations()}
        self.assertEqual(catalog_paths, contract_paths)

    def test_runtime_documents_match_sources(self):
        runtime = ROOT / 'backend/springboot/src/main/resources/api'
        self.assertEqual((ROOT / 'docs/api/openapi.yaml').read_bytes(), (runtime / 'phase1-openapi.yaml').read_bytes())
        self.assertEqual((ROOT / 'docs/api/catalog.yml').read_bytes(), (runtime / 'catalog.yml').read_bytes())

    def test_status_and_permission_match_catalog(self):
        entries = yaml.safe_load((ROOT / 'docs/api/catalog.yml').read_text())['entries']
        for entry in entries:
            op = self.doc['paths'][entry['path'].removeprefix('/api/v1')][entry['method'].lower()]
            with self.subTest(path=entry['path'], method=entry['method']):
                self.assertEqual(entry['status'], op['x-implementation-status'])
                self.assertEqual(entry['permission'], op['x-permission'])

    def test_partial_updates_have_no_create_requirements(self):
        for path in ['/clubs/{clubId}', '/departments/{departmentId}']:
            op = self.doc['paths'][path]['patch']
            ref = op['requestBody']['content']['application/json']['schema']['$ref'].split('/')[-1]
            self.assertFalse(self.doc['components']['schemas'][ref].get('required'))

    def test_query_parameter_type_matches_string_default(self):
        for path, method, op in self.operations():
            for param in op.get('parameters', []):
                schema = param['schema']
                if isinstance(schema.get('default'), str):
                    self.assertEqual(schema['type'], 'string', (path, method, param['name']))

    def test_permission_assignment_lists_are_arrays(self):
        for path in ['/users/me/permissions', '/users/{userId}/permissions']:
            schema = self.doc['paths'][path]['get']['responses']['200']['content']['application/json']['schema']
            self.assertEqual(schema['type'], 'array')
            self.assertEqual(schema['items']['$ref'], '#/components/schemas/UserPermission')

    def test_response_fields_match_java_records(self):
        mapping = {
            'User': 'modules/user/dto/response/UserResponse.java',
            'TokenResponse': 'modules/auth/dto/response/TokenResponse.java',
            'Club': 'modules/club/dto/response/ClubResponse.java',
            'Department': 'modules/department/dto/response/DepartmentResponse.java',
            'Membership': 'modules/membership/dto/response/MembershipResponse.java',
            'DepartmentMember': 'modules/departmentmember/dto/response/DepartmentMemberResponse.java',
            'Permission': 'modules/permission/dto/response/PermissionResponse.java',
            'UserPermission': 'modules/permission/dto/response/UserPermissionResponse.java',
            'Role': 'modules/role/dto/response/RoleResponse.java',
            'UserRole': 'modules/role/dto/response/UserRoleResponse.java',
            'EffectivePermission': 'modules/permission/dto/response/EffectivePermissionResponse.java',
            'AuditLog': 'modules/audit/dto/response/AuditLogResponse.java',
        }
        for schema_name, java_path in mapping.items():
            src = (ROOT / 'backend/springboot/src/main/java/com/vju/club' / java_path).read_text()
            fields = set(re.findall(r'(?:UUID|String|boolean|Instant|OffsetDateTime|PermissionScope|List<String>|Map<String, Object>)\s+(\w+)', src.split('public record', 1)[1].split('{', 1)[0]))
            with self.subTest(schema=schema_name):
                self.assertEqual(set(self.doc['components']['schemas'][schema_name]['properties']), fields)

    def test_documents_have_no_duplicate_keys(self):
        # PyYAML silently keeps the last duplicate key, hiding the first value.
        class StrictLoader(yaml.SafeLoader):
            pass

        def construct(loader, node, deep=False):
            keys = [loader.construct_object(key, deep=deep) for key, _ in node.value]
            duplicates = {key for key in keys if keys.count(key) > 1}
            self.assertFalse(duplicates, f'duplicate keys at line {node.start_mark.line + 1}')
            return yaml.SafeLoader.construct_mapping(loader, node, deep)

        StrictLoader.add_constructor(yaml.resolver.BaseResolver.DEFAULT_MAPPING_TAG, construct)
        for name in ['docs/api/openapi.yaml', 'docs/api/catalog.yml']:
            yaml.load((ROOT / name).read_text(), StrictLoader)

if __name__ == '__main__':
    unittest.main()
