class SnakeGame:
    NAME = "SnakeGame"

    def __init__(self):
        pass

    @classmethod
    def INPUT_TYPES(cls):
        return {}
    
    RETURN_TYPES = ()
    FUNCTION = "play_snake"
    OUTPUT_NODE = True
    CATEGORY = "CrasH Utils/Games"
    
    def play_snake(self):
        return ()