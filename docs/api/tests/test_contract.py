"""Static checks complement OpenAPI validation and live backend contract tests."""
import pathlib
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
                if method == 'post' and '/auth/' not in path:
                    self.assertIn('201', op['responses'])
                if method == 'delete':
                    self.assertIn('204', op['responses'])


    def test_contract_paths_match_catalog_inventory(self):
        catalog = yaml.safe_load((ROOT / 'docs/api/catalog.yml').read_text())['entries']
        catalog_paths = {(e['method'].lower(), e['path'].replace('/api/v1', '', 1)) for e in catalog}
        contract_paths = {(method, path) for path, method, _ in self.operations()}
        self.assertEqual(catalog_paths, contract_paths)

if __name__ == '__main__':
    unittest.main()
