import os
from flask import Flask, jsonify
from flask_cors import CORS
from database import init_db

# Import blueprints
from blueprints.auth import auth_bp
from blueprints.analytics import analytics_bp
from blueprints.academic import academic_bp
from blueprints.imports import imports_bp
from blueprints.tickets import tickets_bp
from blueprints.messages import messages_bp
from blueprints.reports import reports_bp

def create_app():
    app = Flask(__name__)
    app.config['SECRET_KEY'] = 'eduinsight-ai-production-session-key-2025'

    # Enable CORS for frontend
    CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)

    # Initialize Database on boot if needed
    init_db()

    # Register blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(analytics_bp)
    app.register_blueprint(academic_bp)
    app.register_blueprint(imports_bp)
    app.register_blueprint(tickets_bp)
    app.register_blueprint(messages_bp)
    app.register_blueprint(reports_bp)

    @app.route('/api/health', methods=['GET'])
    def health():
        return jsonify({
            'status': 'healthy',
            'product': 'EduInsight AI',
            'version': '1.0.0',
            'architecture': 'Flask REST API + SQLite/MySQL Engine'
        })

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({'error': 'Resource not found'}), 404

    @app.errorhandler(500)
    def server_error(e):
        return jsonify({'error': 'Internal server error'}), 500

    return app

app = create_app()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    host = os.environ.get('HOST', '0.0.0.0')
    print(f"EduInsight AI Backend listening on http://{host}:{port}")
    app.run(host=host, port=port, debug=False)
