from PIL import Image
import os


def split_image(image_path, row, col):
    img = Image.open(image_path)

    width, height = img.size

    tile_width = width // col
    tile_height = height // row

    filename = os.path.splitext(os.path.basename(image_path))[0]
    folder = os.path.dirname(image_path)

    total = row * col
    digits = len(str(total))

    index = 1

    for r in range(row):
        for c in range(col):
            left = c * tile_width
            upper = r * tile_height

            # 最后一列/最后一行吃掉可能的余数
            right = width if c == col - 1 else left + tile_width
            lower = height if r == row - 1 else upper + tile_height

            crop = img.crop((left, upper, right, lower))

            save_name = f"{filename}_{index:0{digits}d}.png"
            save_path = os.path.join(folder, save_name)

            crop.save(save_path)

            print(f"Saved: {save_name}")

            index += 1


if __name__ == "__main__":
    image_path = input("请输入png图片路径: ")

    row = int(input("行数 row: "))
    col = int(input("列数 col: "))

    split_image(image_path, row, col)