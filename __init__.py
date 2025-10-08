import os
from nodes import EXTENSION_WEB_DIRS

from .nodes import NODE_CLASS_MAPPINGS, NODE_DISPLAY_NAME_MAPPINGS

__version__ = "1.0.1"

# Register web directory for Snake game
EXTENSION_WEB_DIRS["crash-utils"] = os.path.join(os.path.dirname(os.path.realpath(__file__)), 'js')

__all__ = ['NODE_CLASS_MAPPINGS', 'NODE_DISPLAY_NAME_MAPPINGS']