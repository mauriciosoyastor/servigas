# from odoo import http


# class ServigasCore(http.Controller):
#     @http.route('/servigas_core/servigas_core', auth='public')
#     def index(self, **kw):
#         return "Hello, world"

#     @http.route('/servigas_core/servigas_core/objects', auth='public')
#     def list(self, **kw):
#         return http.request.render('servigas_core.listing', {
#             'root': '/servigas_core/servigas_core',
#             'objects': http.request.env['servigas_core.servigas_core'].search([]),
#         })

#     @http.route('/servigas_core/servigas_core/objects/<model("servigas_core.servigas_core"):obj>', auth='public')
#     def object(self, obj, **kw):
#         return http.request.render('servigas_core.object', {
#             'object': obj
#         })

