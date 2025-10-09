class TetrisGame:
    NAME = "TetrisGame"

    def __init__(self):
        pass

    @classmethod
    def INPUT_TYPES(cls):
        return {}
    
    RETURN_TYPES = ()
    FUNCTION = "play_tetris"
    OUTPUT_NODE = True
    CATEGORY = "CrasH Utils/Games"
    
    def play_tetris(self):
        return ()