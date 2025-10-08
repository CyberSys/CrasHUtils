from .image_glitcher import ImageGlitcher
from .color_stylizer import ColorStylizer
from .local_llm import QueryLocalLLM, ExtractCharacterInfo
from .sdxl_resolution import SdxlResolution, SdxlResolutionToDimensions
from .checkpoint_names import CheckpointNames
from .snake_game import SnakeGame

NODE_CLASS_MAPPINGS = {
    ImageGlitcher.NAME: ImageGlitcher,
    ColorStylizer.NAME: ColorStylizer,
    QueryLocalLLM.NAME: QueryLocalLLM,
    SdxlResolution.NAME: SdxlResolution,
    SdxlResolutionToDimensions.NAME: SdxlResolutionToDimensions,
    CheckpointNames.NAME: CheckpointNames,
    ExtractCharacterInfo.NAME: ExtractCharacterInfo,
    SnakeGame.NAME: SnakeGame
}

# A dictionary that contains the friendly/humanly readable titles for the nodes
NODE_DISPLAY_NAME_MAPPINGS = {
    "ImageGlitcher": "Image Glitcher",
    "ColorStylizer": "Color Stylizer",
    "QueryLocalLLM": "Query Local LLM",
    "SdxlResolution": "SDXL Resolution",
    "SdxlResolutionToDimensions": "SDXL Resolution To Dimensions",
    "CheckPointNames": "Checkpoint Names",
    "ExtractCharacterInfo": "Extract Character Info",
    "SnakeGame": "Snake Game 🐍"
}

__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS"]
