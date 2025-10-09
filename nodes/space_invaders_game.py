class SpaceInvadersGame:
    NAME = "SpaceInvadersGame"

    def __init__(self):
        pass

    @classmethod
    def INPUT_TYPES(cls):
        return {}
    
    RETURN_TYPES = ()
    FUNCTION = "play_space_invaders"
    OUTPUT_NODE = True
    CATEGORY = "CrasH Utils/Games"
    
    def play_space_invaders(self):
        return ()