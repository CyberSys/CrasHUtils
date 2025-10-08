class DinoGame:
    NAME = "DinoGame"

    def __init__(self):
        pass

    @classmethod
    def INPUT_TYPES(cls):
        return {}
    
    RETURN_TYPES = ()
    FUNCTION = "play_dino"
    OUTPUT_NODE = True
    CATEGORY = "CrasH Utils/Games"
    
    def play_dino(self):
        return ()